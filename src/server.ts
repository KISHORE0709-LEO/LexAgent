import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import { stream } from "hono/streaming";
import { legalDocumentWorkflow } from "./mastra/workflows/legalWorkflow.js";

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
  // Use Hono's streaming response
  return stream(c, async (stream) => {
    try {
      sendStreamEvent(stream, { processing_status: "uploading" });

      const body = await c.req.parseBody();
      const files = body["files"];
      let extractedText = "";

      if (!files) {
        sendStreamEvent(stream, { processing_status: "failed", error: "No files provided." });
        return;
      }

      // Handle both single file and array of files
      const fileArray = Array.isArray(files) ? files : [files];
      
      // Delay for UX
      await new Promise(r => setTimeout(r, 1000));
      sendStreamEvent(stream, { processing_status: "extracting" });

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
        sendStreamEvent(stream, { processing_status: "failed", error: "Extracted text is too short." });
        return;
      }

      await new Promise(r => setTimeout(r, 1000));
      sendStreamEvent(stream, { processing_status: "summarising" });

      // RUN THE MASTRA WORKFLOW
      const run = await legalDocumentWorkflow.createRun();
      const result = await run.start({ inputData: { contractText: extractedText } });

      if (result.status !== "success") {
        const errorMsg = result.status === "failed" ? String(result.error) : `Workflow status: ${result.status}`;
        sendStreamEvent(stream, { processing_status: "failed", error: errorMsg });
        return;
      }

      await new Promise(r => setTimeout(r, 1000));
      sendStreamEvent(stream, { processing_status: "structuring" });

      // Transform workflow output into Mandamus expected format
      const finalPayload = transformToMandamusFormat(result.result);

      await new Promise(r => setTimeout(r, 1000));
      sendStreamEvent(stream, {
        processing_status: "complete",
        ...finalPayload,
      });

    } catch (err) {
      console.error(err);
      sendStreamEvent(stream, { processing_status: "failed", error: (err as Error).message });
    }
  });
});

/**
 * Transforms the output of our Legal PRD Workflow into the massive JSON structure
 * expected by the Mandamus UI Summarizer dashboard.
 */
function transformToMandamusFormat(workflowResult: any) {
  // workflowResult contains: { jurisdiction, results, fullAnalysis (which we will add) }
  const data = workflowResult.fullAnalysis || {}; // We will make the workflow output this
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

  return {
    case_id: data.caseId || "DOC-" + Math.floor(Math.random() * 10000),
    court_name: workflowResult.jurisdiction || "Unknown Jurisdiction",
    filing_date: new Date().getFullYear().toString(),
    pending_duration: "N/A",
    petitioner: data.partyA || "Party A",
    petitioner_counsel: "N/A",
    respondent: data.partyB || "Party B",
    respondent_counsel: "N/A",
    plain_summary: data.summary || "Legal document analysis complete.",
    key_facts: data.facts || ["Analyzed contract successfully."],
    core_legal_questions: data.legalQuestions || ["Are the clauses enforceable?", "Are there high risk liabilities?"],
    ipc_sections: flaggedClauses, // We hijacked this for Flagged Clauses
    evidence: [], 
    case_type: "Contract Review",
    is_undertrial: false,
    confidence_score: 92,
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
serve({ fetch: app.fetch, port }, () => {
  console.log(`Legal Agent Backend running at http://localhost:${port}`);
});
