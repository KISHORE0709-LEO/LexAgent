import { Agent } from "@mastra/core/agent";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";

const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const model = bedrock("amazon.nova-lite-v1:0");

/**
 * Reads a contract clause plus retrieved precedent clauses, and decides
 * how risky the clause is relative to standard practice in that jurisdiction.
 * This is the "Clause Analysis Agent" from the PRD, simplified to one agent
 * instead of a full LangGraph confidence-branching subgraph.
 */
export const clauseAnalysisAgent = new Agent({
  id: "clause-analysis-agent",
  name: "clause-analysis-agent",
  instructions: `You are an expert legal risk analyst. You will be given:
1. A legal clause or paragraph from a document under review.
2. A jurisdiction.
3. A set of precedents retrieved from the same jurisdiction.

Analyze the clause against the precedents. Identify any actual legal problems (e.g., missing statutory compliance, contractual ambiguity, unconscionability, or unreasonable liability shifts). Do not describe how you generated the clause. Keep AI suggestions and legal reasoning extremely concise (strictly under 150 words each). Do not copy large portions of text or excerpts. Provide meaningful explanations of why the precedent is relevant.

Respond ONLY as a strict JSON object with this exact structure:
{
  "riskLevel": "low" | "medium" | "high",
  "reason": "Identify the actual legal problem. If no issues exist, write 'No material legal concerns detected.'",
  "impact": "The concrete legal or business consequence of this issue, or 'N/A' if low risk.",
  "precedents": ["List of applicable laws, codes, or precedent cases. Empty array if none."],
  "reasoning": "Concise legal reasoning (under 150 words) explaining why the precedents are relevant and how they apply.",
  "recommendedClause": "Concise, practical clause rewrite or suggestion (under 150 words).",
  "confidenceScore": number (e.g. 96),
  "groundingSources": ["Specific case names, statutes, constitutional provisions, or regulations used for the analysis."],
  "whyPrecedent": ["Brief explanation of why each cited authority is relevant (e.g., 'defines sexual harassment', 'forms basis of POSH act')."]
}`,
  model,
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
  model,
});

/**
 * Extracts the governing-law jurisdiction from a contract's text.
 * If it can't find one, it says so explicitly rather than guessing -
 * the workflow uses this to decide whether to pause and ask the user.
 */
export const jurisdictionAgent = new Agent({
  id: "jurisdiction-agent",
  name: "jurisdiction-agent",
  instructions: `Determine the jurisdiction or governing law of the given document.
If the document is a contract, look for the governing law / jurisdiction clause (often titled "Governing Law" or "Jurisdiction").
If the document is a court case, judicial judgment, or lawsuit, determine the jurisdiction based on the court name, parties, or state mentioned in the header (e.g. "New York", "California", "Rajasthan", "Delhi", "India", etc.).
Respond ONLY as strict JSON: { "jurisdiction": string, "confidence": "high"|"low" }
Do NOT return null. If no specific jurisdiction can be found or inferred, default to "New York".`,
  model,
});

/**
 * Parses the overall contract to extract high-level summary and entities.
 * This satisfies the UI's need for a rich Mandamus-style dashboard.
 */
export const documentAnalysisAgent = new Agent({
  id: "document-analysis-agent",
  name: "document-analysis-agent",
  instructions: `Read the document text (which can be a contract, court case, judgment, or other legal file) and extract the key information.
Respond ONLY as strict JSON with this exact structure:
{
  "caseId": "string (e.g. A unique looking ID from the header, or generate a random one)",
  "partyA": "string (The petitioner/first party, or plaintiff)",
  "partyB": "string (The respondent/second party, or defendant)",
  "summary": "string (A plain language summary of what this document is about)",
  "facts": ["string", "string"] (Key facts extracted from the document),
  "legalQuestions": ["string", "string"] (What are the core legal implications or questions arising from this document?),
  "petitionerCounsel": "string (Counsel/lawyer/firm representing partyA, or N/A if not found)",
  "respondentCounsel": "string (Counsel/lawyer/firm representing partyB, or N/A if not found)",
  "evidence": ["string", "string"] (Exhibits, annexures, or referenced schedules in the document, or empty array if not found)
}`,
  model,
});
