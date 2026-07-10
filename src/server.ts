import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import { stream } from "hono/streaming";
import { legalDocumentWorkflow } from "./mastra/workflows/legalWorkflow.js";
import { ensureCollection, ensureSessionCollection } from "./lib/qdrant.js";

const app = new Hono();

app.use("/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

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
          const pdfData = await pdf(Buffer.from(buffer));
          extractedText += pdfData.text + "\n\n";
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

    // RUN THE MASTRA WORKFLOW (run it before starting the stream so we can return HTTP 500 on failure)
    const run = await legalDocumentWorkflow.createRun();
    const result = await run.start({ inputData: { contractText: extractedText } });

    if (result.status !== "success") {
      const errorMsg = result.status === "failed" ? String(result.error) : `Workflow status: ${result.status}`;
      return c.json({ error: errorMsg }, 500);
    }

    // Use Hono's streaming response helper to stream progress & complete payload to the UI
    return stream(c, async (stream) => {
      sendStreamEvent(stream, { processing_status: "uploading" });
      sendStreamEvent(stream, { processing_status: "extracting" });
      sendStreamEvent(stream, { processing_status: "summarising" });
      sendStreamEvent(stream, { processing_status: "structuring" });

      // Transform workflow output into Mandamus expected format
      const finalPayload = transformToMandamusFormat(result.result);

      sendStreamEvent(stream, {
        processing_status: "complete",
        ...finalPayload,
      });
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

  // Map high/medium risk clauses into IPC Sections (which the UI calls "Flagged Statutes")
  const flaggedClauses = clauses.map((c: any) => {
    let desc = c.rationale ? `Issue: ${c.rationale}\n\n` : `Analysis pending.\n\n`;
    if (c.revisedClause) desc += `[AI Suggestion]: ${c.revisedClause}\n`;
    if (c.guardPassed === false) {
       desc += `\n[ENKRYPT AI BLOCKED]: ${c.guardReasons.join(", ")}`;
    }
    return {
      section: `[${c.riskLevel.toUpperCase()}] Clause`,
      description: desc
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

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, async () => {
  console.log(`Legal Agent Backend running at http://localhost:${port}`);
  try {
    await ensureCollection();
    await ensureSessionCollection();
    console.log("Qdrant collections verified on startup.");
  } catch (error) {
    console.error("Failed to initialize Qdrant collections on startup:", error);
  }
});
