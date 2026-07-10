import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";

/**
 * Reads a contract clause plus retrieved precedent clauses, and decides
 * how risky the clause is relative to standard practice in that jurisdiction.
 * This is the "Clause Analysis Agent" from the PRD, simplified to one agent
 * instead of a full LangGraph confidence-branching subgraph.
 */
export const clauseAnalysisAgent = new Agent({
  id: "clause-analysis-agent",
  name: "clause-analysis-agent",
  instructions: `You are a legal clause risk analyst. You will be given:
1. A clause from a contract under review.
2. A jurisdiction.
3. A set of precedent clauses retrieved from the same jurisdiction.

Compare the contract clause against the precedents. Decide a risk level
(low, medium, high) based on how much the clause deviates from the majority
position of the precedents. Only cite precedents that were actually given to
you - never invent a case name, statute, or precedent that was not provided.
If the clause is materially different from all precedents, flag it as high risk
and explain the specific deviation in plain English.

Respond ONLY as strict JSON: { "riskLevel": "low"|"medium"|"high", "explanation": string, "deviatesFrom": string[] }`,
  model: google("gemini-1.5-flash"),
});

/**
 * Given a risky clause and the grounding precedents, drafts a safer
 * alternative. Must stay strictly grounded in the retrieved precedents -
 * this constraint is what the Output Guard checks afterward.
 */
export const draftingAgent = new Agent({
  id: "drafting-agent",
  name: "drafting-agent",
  instructions: `You are a contract drafting assistant. You will be given a
risky clause, the jurisdiction, and a set of precedent clauses retrieved from
that same jurisdiction. Draft a revised version of the clause that:
- Stays enforceable and standard for the given jurisdiction
- Is grounded ONLY in the language and concepts present in the provided precedents
- Does NOT invent statute numbers, case citations, or legal claims that are not
  present in the precedents given to you
- Is written in clear, professional contract language

If you previously attempted this and were told your draft failed a safety
check, you will also be given the specific failure reason - correct that
specific issue in this attempt.

Respond ONLY as strict JSON: { "revisedClause": string, "rationale": string }`,
  model: google("gemini-1.5-flash"),
});

/**
 * Extracts the governing-law jurisdiction from a contract's text.
 * If it can't find one, it says so explicitly rather than guessing -
 * the workflow uses this to decide whether to pause and ask the user.
 */
export const jurisdictionAgent = new Agent({
  id: "jurisdiction-agent",
  name: "jurisdiction-agent",
  instructions: `Read the contract text and find the governing law / jurisdiction
clause (often titled "Governing Law" or "Jurisdiction"). Respond ONLY as strict
JSON: { "jurisdiction": string | null, "confidence": "high"|"low" }
Use "New York" or "California" as the jurisdiction value if the contract
references either state. If no governing law clause is found, set jurisdiction
to null.`,
  model: google("gemini-1.5-flash"),
});

/**
 * Parses the overall contract to extract high-level summary and entities.
 * This satisfies the UI's need for a rich Mandamus-style dashboard.
 */
export const documentAnalysisAgent = new Agent({
  id: "document-analysis-agent",
  name: "document-analysis-agent",
  instructions: `Read the contract text and extract the key information.
Respond ONLY as strict JSON with this exact structure:
{
  "caseId": "string (e.g. A unique looking ID from the header, or generate a random one)",
  "partyA": "string (The petitioner/first party)",
  "partyB": "string (The respondent/second party)",
  "summary": "string (A plain language summary of what this contract is about)",
  "facts": ["string", "string"] (Key facts extracted from the contract),
  "legalQuestions": ["string", "string"] (What are the core legal implications or questions arising from this contract?),
  "petitionerCounsel": "string (Counsel/lawyer/firm representing partyA, or N/A if not found)",
  "respondentCounsel": "string (Counsel/lawyer/firm representing partyB, or N/A if not found)",
  "evidence": ["string", "string"] (Exhibits, annexures, or referenced schedules in the contract, or empty array if not found)
}`,
  model: google("gemini-1.5-flash"),
});
