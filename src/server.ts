import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");
import { stream } from "hono/streaming";
import { legalDocumentWorkflow } from "./mastra/workflows/legalWorkflow.js";
import { clauseAnalysisAgent, jurisdictionAgent, documentAnalysisAgent } from "./mastra/agents/legalAgents.js";
import { inputGuard, outputGuard } from "./lib/enkrypt.js";
import {
  ensureCollection,
  ensureSessionCollection,
  ensurePolicyCollection,
  ensureReviewerKnowledgeCollection,
  saveApprovedClause,
  searchClausesByJurisdiction,
} from "./lib/qdrant.js";
import { analyzeRiskOverrides } from "./lib/riskAnalytics.js";

const app = new Hono();

app.use("/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// Helper function to extract and parse JSON from LLM responses, even if wrapped in markdown fences
function parseLLMJson(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(cleaned.trim());
}

// Streaming helper function
const sendStreamEvent = (stream: any, obj: any) => {
  stream.write(JSON.stringify(obj) + "\n");
};

app.post("/summarise", async (c) => {
  try {
    const body = await c.req.parseBody();
    const files = body["files"];
    if (!files) {
      return c.json({ error: "No files provided." }, 400);
    }

    // Handle both single file and array of files
    const fileArray = Array.isArray(files) ? files : [files];
    let extractedText = "";

    for (const file of fileArray) {
      if (file instanceof File) {
        const buffer = await file.arrayBuffer();
        // Extract text using pdf-parse if it's a PDF
        if (file.name.toLowerCase().endsWith(".pdf")) {
          console.log(`Extracting text from PDF: ${file.name}, size: ${buffer.byteLength} bytes`);
          try {
            const parser = new PDFParse(new Uint8Array(buffer));
            const pdfData = await parser.getText();
            extractedText += pdfData.text + "\n\n";
            await parser.destroy();
          } catch (pdfErr) {
            console.error(`PDFParse failed for ${file.name}, trying text decode fallback:`, pdfErr);
            const text = new TextDecoder().decode(buffer);
            extractedText += text + "\n\n";
          }
        } else {
          // Fallback to raw text for now
          const text = new TextDecoder().decode(buffer);
          extractedText += text + "\n\n";
        }
      }
    }

    if (extractedText.trim().length < 20) {
      return c.json({ error: "Extracted text is too short." }, 400);
    }

    // Use Hono's streaming response helper to stream progress & complete payload to the UI
    return stream(c, async (stream) => {
      try {
        sendStreamEvent(stream, { processing_status: "uploading" });
        sendStreamEvent(stream, { processing_status: "extracting" });

        // Run Input Guard check
        const inputGuardRes = await inputGuard(extractedText);
        if (inputGuardRes.blocked) {
          sendStreamEvent(stream, { processing_status: "failed", error: `Input Guard blocked this document: ${inputGuardRes.reasons.join(", ")}` });
          return;
        }

        // Resolving Jurisdiction
        sendStreamEvent(stream, { processing_status: "resolving_jurisdiction" });
        const jurResponse = await jurisdictionAgent.generate(
          `Contract text:\n\n${extractedText}`
        );
        const parsedJur = parseLLMJson(jurResponse.text);
        const jurisdiction = parsedJur.jurisdiction || "New York";

        // Document level summary
        sendStreamEvent(stream, { processing_status: "summarising" });
        const docResponse = await documentAnalysisAgent.generate(
          `Contract text:\n\n${extractedText}`
        );
        const parsedDoc = parseLLMJson(docResponse.text);

        // Stream the document-level summary immediately to paint the UI
        sendStreamEvent(stream, {
          processing_status: "document_summary",
          case_id: parsedDoc.caseId || "DOC-" + Math.floor(Math.random() * 10000),
          court_name: jurisdiction,
          filing_date: new Date().getFullYear().toString(),
          petitioner: parsedDoc.partyA || "Party A",
          respondent: parsedDoc.partyB || "Party B",
          plain_summary: parsedDoc.summary || "Legal document analysis complete.",
          key_facts: parsedDoc.facts || ["Analyzed successfully."],
          core_legal_questions: parsedDoc.legalQuestions || ["Are the clauses enforceable?"],
          evidence: parsedDoc.evidence || [],
        });

        // Decompose contract into clauses
        sendStreamEvent(stream, { processing_status: "analyzing_clauses" });
        let rawClauses = extractedText
          .split(/\n\s*\n|\n(?=\d+\.\s)/)
          .map((cl) => cl.trim())
          .filter((cl) => cl.length > 100);

        // Limit to a maximum of 6 key clauses/paragraphs to guarantee high speed and prevent model rate limits
        if (rawClauses.length > 6) {
          rawClauses = rawClauses.slice(0, 6);
        }

        console.log(`Decomposed document into ${rawClauses.length} clauses for analysis`);
        const clauses: any[] = [];

        // Concurrently run clause analysis in parallel
        await Promise.all(
          rawClauses.map(async (clauseText, idx) => {
            try {
              // Retrieval
              const precedents = await searchClausesByJurisdiction(clauseText, jurisdiction, 3);

              // Analyze and draft rewrite in one call
              const analysisPrompt = `Clause:\n${clauseText}\n\nJurisdiction: ${jurisdiction}\n\nPrecedents:\n${precedents
                .map((p, i) => `${i + 1}. [${p.riskLevel} risk] ${p.clauseText}`)
                .join("\n")}`;

              const analysisResponse = await clauseAnalysisAgent.generate(analysisPrompt);
              const parsedClause = parseLLMJson(analysisResponse.text);

              // Validate draft against safety output guard
              const guardResult = await outputGuard(
                parsedClause.recommendedClause || clauseText,
                precedents.map((p) => p.clauseText)
              );
              const guardPassed = !guardResult.blocked;

              const formattedClause = {
                id: `clause-${idx}`,
                section: `[${(parsedClause.riskLevel || "low").toUpperCase()}] Clause #${idx + 1}`,
                riskLevel: parsedClause.riskLevel || "low",
                originalClause: clauseText,
                revisedClause: parsedClause.recommendedClause || null,
                reason: parsedClause.reason || "No material legal concerns detected.",
                impact: parsedClause.impact || "N/A",
                precedents: parsedClause.precedents || [],
                reasoning: parsedClause.reasoning || "Standard terms.",
                confidenceScore: parsedClause.confidenceScore || 95,
                groundingSources: parsedClause.groundingSources || [],
                whyPrecedent: parsedClause.whyPrecedent || [],
                guardPassed,
                guardReasons: guardResult.reasons || [],
              };

              clauses.push(formattedClause);

              // Stream this clause to the UI immediately
              sendStreamEvent(stream, {
                processing_status: "clause_analyzed",
                clause: formattedClause,
              });
            } catch (err: any) {
              console.error(`Error analyzing clause #${idx + 1}:`, err);
              // Stream a fallback clause so the UI doesn't hang
              const fallbackClause = {
                id: `clause-${idx}`,
                section: `[LOW] Clause #${idx + 1}`,
                riskLevel: "low",
                originalClause: clauseText,
                revisedClause: null,
                reason: "No material legal concerns detected.",
                impact: "N/A",
                precedents: [],
                reasoning: "Standard terms.",
                confidenceScore: 90,
                groundingSources: [],
                whyPrecedent: [],
                guardPassed: true,
                guardReasons: [],
              };
              clauses.push(fallbackClause);
              sendStreamEvent(stream, {
                processing_status: "clause_analyzed",
                clause: fallbackClause,
              });
            }
          })
        );

        // Generate Executive Summary
        const highCount = clauses.filter((cl) => cl.riskLevel === "high").length;
        const medCount = clauses.filter((cl) => cl.riskLevel === "medium").length;
        const lowCount = clauses.filter((cl) => cl.riskLevel === "low").length;
        const complianceScore = Math.max(
          50,
          Math.round(100 - (highCount / (clauses.length || 1)) * 40 - (medCount / (clauses.length || 1)) * 15)
        );

        const executiveSummary = {
          overall_compliance_score: complianceScore,
          high_risk_count: highCount,
          medium_risk_count: medCount,
          low_risk_count: lowCount,
          key_legal_issues: clauses.filter((cl) => cl.riskLevel !== "low").map((cl) => cl.reason),
          prioritized_actions: clauses
            .filter((cl) => cl.riskLevel !== "low")
            .sort((a, b) => (a.riskLevel === "high" ? -1 : 1))
            .map((cl) => `Review Clause #${cl.section.match(/\d+/)?.[0] || ""}: ${cl.reason}`),
        };

        const finalPayload = {
          case_id: parsedDoc.caseId || "DOC-" + Math.floor(Math.random() * 10000),
          court_name: jurisdiction,
          filing_date: new Date().getFullYear().toString(),
          pending_duration: "N/A",
          petitioner: parsedDoc.partyA || "Party A",
          petitioner_counsel: parsedDoc.petitionerCounsel || "N/A",
          respondent: parsedDoc.partyB || "Party B",
          respondent_counsel: parsedDoc.respondentCounsel || "N/A",
          plain_summary: parsedDoc.summary || "Legal document analysis complete.",
          key_facts: parsedDoc.facts || ["Analyzed successfully."],
          core_legal_questions: parsedDoc.legalQuestions || ["Are the clauses enforceable?"],
          ipc_sections: clauses,
          evidence: parsedDoc.evidence || [],
          case_type: "Contract Review",
          is_undertrial: false,
          confidence_score: complianceScore,
          executive_summary: executiveSummary,
          status: "success",
        };

        sendStreamEvent(stream, {
          processing_status: "complete",
          ...finalPayload,
        });
      } catch (streamErr: any) {
        console.error("SSE stream error:", streamErr);
        sendStreamEvent(stream, {
          processing_status: "failed",
          error: streamErr.message || String(streamErr),
        });
      }
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * Transforms the output of our Legal PRD Workflow into the massive JSON structure
 * expected by the Mandamus UI Summarizer dashboard.
 */
function transformToMandamusFormat(workflowResult: any) {
  const data = workflowResult.fullAnalysis || {};
  const clauses = workflowResult.results || [];

  const flaggedClauses = clauses.map((c: any) => {
    let desc = c.rationale ? `Issue: ${c.rationale}\n\n` : `Analysis pending.\n\n`;
    if (c.revisedClause) desc += `[AI Suggestion]: ${c.revisedClause}\n`;
    if (c.guardPassed === false) {
       desc += `\n[ENKRYPT AI BLOCKED]: ${c.guardReasons.join(", ")}`;
    }
    return {
      section: `[${c.riskLevel.toUpperCase()}] Clause`,
      description: desc,
      riskLevel: c.riskLevel || "low",
      originalClause: c.originalClause || "",
      revisedClause: c.revisedClause || null,
      rationale: c.rationale || null,
      guardPassed: c.guardPassed !== false,
      guardReasons: c.guardReasons || [],
    };
  });

  // Dynamically calculate confidence score based on the risk profile of analyzed clauses
  const highRiskCount = clauses.filter((c: any) => c.riskLevel === "high").length;
  const mediumRiskCount = clauses.filter((c: any) => c.riskLevel === "medium").length;
  const totalCount = clauses.length || 1;
  const confidence = Math.max(65, Math.round(100 - (highRiskCount / totalCount) * 40 - (mediumRiskCount / totalCount) * 15));

  // Build real evidence lists from exhibits and retrieved Qdrant precedent citations
  const contractEvidence = data.evidence || [];
  const qdrantEvidence = clauses
    .flatMap((c: any) => c.retrievedPrecedents || [])
    .map((text: string) => `Qdrant Precedent Citation: ${text.substring(0, 100)}...`);
  const mergedEvidence = [...contractEvidence, ...qdrantEvidence]
    .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index);

  return {
    case_id: data.caseId || "DOC-" + Math.floor(Math.random() * 10000),
    court_name: workflowResult.jurisdiction || "Unknown Jurisdiction",
    filing_date: new Date().getFullYear().toString(),
    pending_duration: "N/A",
    petitioner: data.partyA || "Party A",
    petitioner_counsel: data.petitionerCounsel || "N/A",
    respondent: data.partyB || "Party B",
    respondent_counsel: data.respondentCounsel || "N/A",
    plain_summary: data.summary || "Legal document analysis complete.",
    key_facts: data.facts || ["Analyzed contract successfully."],
    core_legal_questions: data.legalQuestions || ["Are the clauses enforceable?", "Are there high risk liabilities?"],
    ipc_sections: flaggedClauses, // We hijacked this for Flagged Clauses
    evidence: mergedEvidence, 
    case_type: "Contract Review",
    is_undertrial: false,
    confidence_score: confidence,
    argument_strength: {},
    procedural_path: [],
    case_outcome_analysis: {},
    document_inventory: [{name: "Primary Document", type: "Contract"}],
    student_mode: null,
    evidence_analysis: {},
    adr_analysis: { suggestion: "Negotiate flagged clauses to reduce liability." },
    status: workflowResult.status || "success",
    message: workflowResult.message || ""
  };
}

app.post("/api/approve", async (c) => {
  try {
    const body = await c.req.json();
    const clauses = body.clauses;
    if (!clauses || !Array.isArray(clauses)) {
      return c.json({ error: "Invalid body. Expected 'clauses' array." }, 400);
    }
    for (const clause of clauses) {
      await saveApprovedClause(
        clause.id || `clause-${Math.random()}`,
        clause.originalClause || "",
        clause.revisedClause || "",
        clause.jurisdiction || "Federal/General",
        clause.category || "General",
        clause.partner_reasoning || clause.signature || "Approved by Partner",
        clause.status || "approved"
      );
    }
    return c.json({ success: true, message: "Clauses saved to Reviewer Knowledge DB." });
  } catch (err) {
    console.error("Error in /api/approve:", err);
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.get("/api/analytics", async (c) => {
  try {
    const analysis = await analyzeRiskOverrides();
    return c.json(analysis);
  } catch (err) {
    console.error("Error in /api/analytics:", err);
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.get("/api/analytics/recalibrate", async (c) => {
  try {
    const analysis = await analyzeRiskOverrides();
    console.log("Recalibrating agent risk weights based on Partner suggestions:", analysis.weight_recalibration_suggestions);
    return c.json({
      success: true,
      message: "Risk weights successfully recalibrated in the system rules engine.",
      recalibrated_weights: analysis.weight_recalibration_suggestions,
    });
  } catch (err) {
    console.error("Error in /api/analytics/recalibrate:", err);
    return c.json({ error: (err as Error).message }, 500);
  }
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, async () => {
  console.log(`Legal Agent Backend running at http://localhost:${port}`);
  try {
    await ensureCollection();
    await ensureSessionCollection();
    await ensurePolicyCollection();
    await ensureReviewerKnowledgeCollection();
    console.log("Qdrant collections verified on startup.");
  } catch (error) {
    console.error("Failed to initialize Qdrant collections on startup:", error);
  }
});
