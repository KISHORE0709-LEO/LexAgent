import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { inputGuard, outputGuard } from "../../lib/enkrypt.js";
import { searchClausesByJurisdiction } from "../../lib/qdrant.js";
import { clauseAnalysisAgent, draftingAgent, jurisdictionAgent } from "../agents/legalAgents.js";

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
  outputSchema: z.object({ contractText: z.string(), jurisdiction: z.string().nullable() }),
  execute: async ({ inputData }) => {
    const response = await jurisdictionAgent.generate(
      `Contract text:\n\n${inputData.contractText}`
    );
    const parsed = JSON.parse(response.text) as { jurisdiction: string | null };
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
  inputSchema: z.object({ contractText: z.string(), jurisdiction: z.string().nullable() }),
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
  }),
  execute: async ({ inputData }) => {
    if (!inputData.jurisdiction) {
      // PRD requirement: never guess. Pause and require manual input instead
      // of silently defaulting to a jurisdiction.
      throw new Error(
        "Could not resolve governing-law jurisdiction. Manual jurisdiction input required before analysis can continue."
      );
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
          .map((p, i) => `${i + 1}. [${p.riskLevel} risk, ${p.clauseType}] ${p.text}`)
          .join("\n")}`
      );
      const parsed = JSON.parse(analysisResponse.text) as {
        riskLevel: "low" | "medium" | "high";
        explanation: string;
      };

      clauses.push({
        clauseText,
        riskLevel: parsed.riskLevel,
        explanation: parsed.explanation,
        retrievedPrecedents: precedents.map((p) => p.text),
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
  }),
  execute: async ({ inputData }) => {
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
        const parsed = JSON.parse(draftResponse.text) as { revisedClause: string; rationale: string };
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

export const legalDocumentWorkflow = createWorkflow({
  id: "legal-document-workflow",
  inputSchema: z.object({ contractText: z.string() }),
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
  }),
})
  .then(inputGuardStep)
  .then(jurisdictionStep)
  .then(clauseAnalysisStep)
  .then(draftAndGuardStep)
  .commit();
