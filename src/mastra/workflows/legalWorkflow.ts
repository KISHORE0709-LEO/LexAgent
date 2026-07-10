import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { inputGuard, outputGuard } from "../../lib/enkrypt.js";
import { searchClausesByJurisdiction } from "../../lib/qdrant.js";
import { clauseAnalysisAgent, draftingAgent, jurisdictionAgent, documentAnalysisAgent } from "../agents/legalAgents.js";

// ---------- Step 1: Enkrypt Input Guard ----------
// Runs BEFORE any LLM sees the document. Blocks prompt injection, PII, toxicity.
const inputGuardStep = createStep({
  id: "input-guard",
  inputSchema: z.object({ contractText: z.string() }),
  outputSchema: z.object({ contractText: z.string(), inputGuardPassed: z.boolean() }),
  execute: async ({ inputData }) => {
    const result = await inputGuard(inputData.contractText);
    if (result.blocked) {
      // Hard stop - this mirrors the PRD requirement that the pipeline
      // does not proceed if the Input Guard check fails.
      throw new Error(`Input Guard blocked this document: ${result.reasons.join(", ")}`);
    }
    return { contractText: inputData.contractText, inputGuardPassed: true };
  },
});

// ---------- Step 2: Jurisdiction Resolution ----------
const jurisdictionStep = createStep({
  id: "jurisdiction-resolve",
  inputSchema: z.object({ contractText: z.string(), inputGuardPassed: z.boolean() }),
  outputSchema: z.object({
    contractText: z.string(),
    jurisdiction: z.string().nullable(),
    status: z.string().optional(),
    message: z.string().optional(),
    success: z.boolean().optional(),
    error: z.string().optional(),
    raw: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const response = await jurisdictionAgent.generate(
      `Contract text:\n\n${inputData.contractText}`
    );
    let parsed: { jurisdiction: string | null } = { jurisdiction: null };
    try {
      parsed = JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse jurisdictionAgent response JSON. Raw response text was:\n", response.text);
      return {
        contractText: inputData.contractText,
        jurisdiction: null,
        status: "error",
        message: `Failed to parse jurisdiction resolution response: ${(e as Error).message}`,
        success: false,
        error: "parse_failed",
        raw: response.text,
      };
    }
    
    if (parsed.jurisdiction === null) {
      return {
        contractText: inputData.contractText,
        jurisdiction: null,
        status: "jurisdiction_required",
        message: "Could not detect jurisdiction. Please specify your contract jurisdiction.",
      };
    }

    return { contractText: inputData.contractText, jurisdiction: parsed.jurisdiction };
  },
});

// ---------- Step 3: Clause Decomposition + Jurisdiction-Filtered Analysis ----------
type ClauseAnalysis = {
  clauseText: string;
  riskLevel: "low" | "medium" | "high";
  explanation: string;
  retrievedPrecedents: string[];
};

const clauseAnalysisStep = createStep({
  id: "clause-analysis",
  inputSchema: z.object({
    contractText: z.string(),
    jurisdiction: z.string().nullable(),
    status: z.string().optional(),
    message: z.string().optional(),
    success: z.boolean().optional(),
    error: z.string().optional(),
    raw: z.string().optional(),
  }),
  outputSchema: z.object({
    jurisdiction: z.string(),
    clauses: z.array(
      z.object({
        clauseText: z.string(),
        riskLevel: z.enum(["low", "medium", "high"]),
        explanation: z.string(),
        retrievedPrecedents: z.array(z.string()),
      })
    ),
    status: z.string().optional(),
    message: z.string().optional(),
    success: z.boolean().optional(),
    error: z.string().optional(),
    raw: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.success === false || inputData.status === "error") {
      return {
        status: "error",
        message: inputData.message || "An error occurred during jurisdiction resolution",
        jurisdiction: "",
        clauses: [],
        success: false,
        error: inputData.error || "error",
        raw: inputData.raw || "",
      };
    }

    if (inputData.status === "jurisdiction_required" || !inputData.jurisdiction) {
      return {
        status: "jurisdiction_required",
        message: inputData.message || "Could not detect jurisdiction. Please specify your contract jurisdiction.",
        jurisdiction: "",
        clauses: [],
      };
    }
    const jurisdiction = inputData.jurisdiction;

    // Naive clause splitter: real system would use clause-boundary-aware
    // chunking (e.g. Unstructured.io per the PRD). For the MVP, split on
    // numbered clauses / blank lines - good enough to demo the pipeline.
    const rawClauses = inputData.contractText
      .split(/\n\s*\n|\n(?=\d+\.\s)/)
      .map((c) => c.trim())
      .filter((c) => c.length > 40);

    const clauses: ClauseAnalysis[] = [];
    for (const clauseText of rawClauses) {
      // JURISDICTION-HARD-FILTERED retrieval - this is the key differentiator.
      const precedents = await searchClausesByJurisdiction(clauseText, jurisdiction, 3);

      const analysisResponse = await clauseAnalysisAgent.generate(
        `Clause:\n${clauseText}\n\nJurisdiction: ${jurisdiction}\n\nPrecedents retrieved from Qdrant (same jurisdiction only):\n${precedents
          .map((p, i) => `${i + 1}. [${p.riskLevel} risk, ${p.category}] ${p.clauseText}`)
          .join("\n")}`
      );
      let parsed: { riskLevel: "low" | "medium" | "high"; explanation: string };
      try {
        parsed = JSON.parse(analysisResponse.text);
      } catch (e) {
        console.error("Failed to parse clauseAnalysisAgent JSON response. Raw response text was:\n", analysisResponse.text);
        return {
          status: "error",
          message: `Failed to parse clause analysis response: ${(e as Error).message}`,
          jurisdiction: jurisdiction,
          clauses: [],
          success: false,
          error: "parse_failed",
          raw: analysisResponse.text,
        };
      }

      clauses.push({
        clauseText,
        riskLevel: parsed.riskLevel,
        explanation: parsed.explanation,
        retrievedPrecedents: precedents.map((p) => p.clauseText),
      });
    }

    return { jurisdiction, clauses };
  },
});

// ---------- Step 4: Drafting + Enkrypt Output Guard with Regeneration Loop ----------
type DraftResult = {
  originalClause: string;
  riskLevel: "low" | "medium" | "high";
  revisedClause: string | null;
  rationale: string | null;
  guardPassed: boolean;
  guardReasons: string[];
  attempts: number;
};

const draftAndGuardStep = createStep({
  id: "draft-and-guard",
  inputSchema: z.object({
    jurisdiction: z.string(),
    clauses: z.array(
      z.object({
        clauseText: z.string(),
        riskLevel: z.enum(["low", "medium", "high"]),
        explanation: z.string(),
        retrievedPrecedents: z.array(z.string()),
      })
    ),
    status: z.string().optional(),
    message: z.string().optional(),
    success: z.boolean().optional(),
    error: z.string().optional(),
    raw: z.string().optional(),
  }),
  outputSchema: z.object({
    jurisdiction: z.string(),
    results: z.array(
      z.object({
        originalClause: z.string(),
        riskLevel: z.enum(["low", "medium", "high"]),
        revisedClause: z.string().nullable(),
        rationale: z.string().nullable(),
        guardPassed: z.boolean(),
        guardReasons: z.array(z.string()),
        attempts: z.number(),
      })
    ),
    status: z.string().optional(),
    message: z.string().optional(),
    success: z.boolean().optional(),
    error: z.string().optional(),
    raw: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.success === false || inputData.status === "error") {
      return {
        jurisdiction: "",
        results: [],
        status: "error",
        message: inputData.message,
        success: false,
        error: inputData.error || "error",
        raw: inputData.raw || "",
      };
    }
    if (inputData.status === "jurisdiction_required") {
      return {
        jurisdiction: "",
        results: [],
        status: "jurisdiction_required",
        message: inputData.message,
      };
    }

    const MAX_ATTEMPTS = 3;
    const results: DraftResult[] = [];

    for (const clause of inputData.clauses) {
      if (clause.riskLevel === "low") {
        // Low-risk clauses don't need redrafting - straight through.
        results.push({
          originalClause: clause.clauseText,
          riskLevel: clause.riskLevel,
          revisedClause: null,
          rationale: null,
          guardPassed: true,
          guardReasons: [],
          attempts: 0,
        });
        continue;
      }

      let attempts = 0;
      let guardPassed = false;
      let guardReasons: string[] = [];
      let revisedClause: string | null = null;
      let rationale: string | null = null;
      let priorFailure: string | null = null;

      // THE REGENERATION LOOP - this is the strongest "wow" moment for judges.
      // A failed Output Guard check doesn't dead-end the pipeline; it sends
      // the specific failure reason back to the Drafting Agent as corrective
      // context for another attempt.
      while (attempts < MAX_ATTEMPTS && !guardPassed) {
        attempts++;
        const draftPrompt = `Risky clause:\n${clause.clauseText}\n\nJurisdiction: ${inputData.jurisdiction}\n\nGrounding precedents:\n${clause.retrievedPrecedents
          .map((p, i) => `${i + 1}. ${p}`)
          .join("\n")}${priorFailure ? `\n\nPrevious attempt failed because: ${priorFailure}\nFix this specific issue.` : ""}`;

        const draftResponse = await draftingAgent.generate(draftPrompt);
        let parsed: { revisedClause: string; rationale: string };
        try {
          parsed = JSON.parse(draftResponse.text);
        } catch (e) {
          console.error("Failed to parse draftingAgent response JSON. Raw response text was:\n", draftResponse.text);
          return {
            status: "error",
            message: `Failed to parse drafting response: ${(e as Error).message}`,
            jurisdiction: inputData.jurisdiction,
            results: [],
            success: false,
            error: "parse_failed",
            raw: draftResponse.text,
          };
        }
        revisedClause = parsed.revisedClause;
        rationale = parsed.rationale;

        const guardResult = await outputGuard(revisedClause, clause.retrievedPrecedents);
        guardPassed = !guardResult.blocked;
        guardReasons = guardResult.reasons;
        priorFailure = guardResult.reasons.join(", ") || null;
      }

      results.push({
        originalClause: clause.clauseText,
        riskLevel: clause.riskLevel,
        revisedClause,
        rationale,
        guardPassed,
        guardReasons,
        attempts,
      });
    }

    return { jurisdiction: inputData.jurisdiction, results };
  },
});

// ---------- Step 5: Document Level Summary (For Mandamus UI) ----------
const documentAnalysisStep = createStep({
  id: "document-analysis",
  inputSchema: z.object({
    contractText: z.string(),
    jurisdiction: z.string(),
    results: z.array(z.any()), // From draftAndGuardStep
    status: z.string().optional(),
    message: z.string().optional(),
    success: z.boolean().optional(),
    error: z.string().optional(),
    raw: z.string().optional(),
  }),
  outputSchema: z.object({
    jurisdiction: z.string(),
    results: z.array(z.any()),
    fullAnalysis: z.object({
      caseId: z.string(),
      partyA: z.string(),
      partyB: z.string(),
      summary: z.string(),
      facts: z.array(z.string()),
      legalQuestions: z.array(z.string()),
      petitionerCounsel: z.string().optional(),
      respondentCounsel: z.string().optional(),
      evidence: z.array(z.string()).optional(),
    }),
    status: z.string().optional(),
    message: z.string().optional(),
    success: z.boolean().optional(),
    error: z.string().optional(),
    raw: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.success === false || inputData.status === "error") {
      return {
        jurisdiction: "",
        results: [],
        fullAnalysis: {
          caseId: "PARSING-ERROR",
          partyA: "N/A",
          partyB: "N/A",
          summary: `An error occurred during pipeline execution: ${inputData.message}`,
          facts: [],
          legalQuestions: [],
          petitionerCounsel: "N/A",
          respondentCounsel: "N/A",
          evidence: [],
        },
        status: "error",
        message: inputData.message,
        success: false,
        error: inputData.error || "error",
        raw: inputData.raw || "",
      };
    }

    if (inputData.status === "jurisdiction_required") {
      return {
        jurisdiction: "",
        results: [],
        fullAnalysis: {
          caseId: "JURISDICTION-REQ",
          partyA: "N/A",
          partyB: "N/A",
          summary: "Could not detect jurisdiction. Please specify your contract jurisdiction.",
          facts: [],
          legalQuestions: [],
          petitionerCounsel: "N/A",
          respondentCounsel: "N/A",
          evidence: [],
        },
        status: "jurisdiction_required",
        message: inputData.message || "Could not detect jurisdiction. Please specify your contract jurisdiction.",
      };
    }

    const analysisResponse = await documentAnalysisAgent.generate(
      `Contract text:\n\n${inputData.contractText}`
    );
    let parsed: any;
    try {
      parsed = JSON.parse(analysisResponse.text);
    } catch (e) {
      console.error("Failed to parse documentAnalysisAgent JSON response. Raw response text was:\n", analysisResponse.text);
      return {
        jurisdiction: inputData.jurisdiction,
        results: inputData.results,
        fullAnalysis: {
          caseId: "DOC-ERR",
          partyA: "Unknown",
          partyB: "Unknown",
          summary: "Could not parse document analysis response.",
          facts: [],
          legalQuestions: [],
          petitionerCounsel: "N/A",
          respondentCounsel: "N/A",
          evidence: [],
        },
        status: "error",
        message: `Failed to parse document analysis response: ${(e as Error).message}`,
        success: false,
        error: "parse_failed",
        raw: analysisResponse.text,
      };
    }
    return {
      jurisdiction: inputData.jurisdiction,
      results: inputData.results,
      fullAnalysis: parsed,
    };
  },
});

export const legalDocumentWorkflow = createWorkflow({
  id: "legal-document-workflow",
  inputSchema: z.object({ contractText: z.string() }),
  outputSchema: z.object({
    jurisdiction: z.string(),
    results: z.array(z.any()),
    fullAnalysis: z.object({
      caseId: z.string(),
      partyA: z.string(),
      partyB: z.string(),
      summary: z.string(),
      facts: z.array(z.string()),
      legalQuestions: z.array(z.string()),
      petitionerCounsel: z.string().optional(),
      respondentCounsel: z.string().optional(),
      evidence: z.array(z.string()).optional(),
    }),
    status: z.string().optional(),
    message: z.string().optional(),
    success: z.boolean().optional(),
    error: z.string().optional(),
    raw: z.string().optional(),
  }),
})
  .then(inputGuardStep)
  .then(jurisdictionStep)
  .then(clauseAnalysisStep)
  .then(draftAndGuardStep)
  .map({
    contractText: { step: inputGuardStep, path: "contractText" },
    jurisdiction: { step: draftAndGuardStep, path: "jurisdiction" },
    results: { step: draftAndGuardStep, path: "results" },
    status: { step: draftAndGuardStep, path: "status" },
    message: { step: draftAndGuardStep, path: "message" },
    success: { step: draftAndGuardStep, path: "success" },
    error: { step: draftAndGuardStep, path: "error" },
    raw: { step: draftAndGuardStep, path: "raw" },
  })
  .then(documentAnalysisStep)
  .commit();
