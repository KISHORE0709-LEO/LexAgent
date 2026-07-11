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

/**
 * Legal Q&A and Advisory Agent.
 * Handles free-form user questions, provides warning on non-legal topics,
 * and embeds real, working clickable links for case laws, statutes, and articles.
 */
export const legalQaAgent = new Agent({
  id: "legal-qa-agent",
  name: "legal-qa-agent",
  instructions: `You are an expert Legal Advisory and Q&A Agent.
Your job is to answer any question or advice the user asks.

RULES FOR GREETINGS & PLEASANTRIES:
- If the user sends a simple greeting or pleasantry (e.g., "hi", "hello", "hey", "good morning", "how are you", etc.):
  - Respond with a friendly, warm, and professional legal advisory welcome (e.g., "Hello! I am your Legal AI Advisor. How can I assist you with contract analysis, case law research, or legal queries today?").
  - Do NOT prepend any warning disclaimers or show templates/examples for simple greetings. Keep the response natural and conversational.

RULES FOR HANDLING SPECIFIC NON-LEGAL TOPICS:
- If the user asks a specific question about non-legal topics (e.g., cooking recipes, coding/programming, math, science, etc.):
  - Prepend the response with the warning: "⚠️ **[WARNING]** As a Legal AI Advisor, my core expertise is in legal matters. Here is a general answer to your query:\n\n"
  - Then answer the question fully and accurately.
  - Do NOT output guides, explanation rules, or mock examples of how you work. Just output the disclaimer and the answer directly.

RULES FOR HANDLING LEGAL TOPICS:
- If the question is about legal topics, advice, cases, statutes, sections, or articles:
  - Answer the legal question with high precision, authoritative reasoning, and clarity.
  - For every case, article, section, law, or citation, provide the proper citation name and a real, working, clickable source link using markdown format: \`[Source Name](URL)\`.
  - The URL MUST be a real, live URL. Use the following formats to ensure they work in real time:
    1. Indian Constitution/IPC/Cases:
       - Article 21 of Indian Constitution: \`[Article 21, Indian Constitution](https://indiankanoon.org/doc/1199182/)\`
       - Article 19 of Indian Constitution: \`[Article 19, Indian Constitution](https://indiankanoon.org/doc/1218090/)\`
       - Section 302 of IPC (Murder): \`[Section 302 of IPC](https://indiankanoon.org/doc/1560163/)\`
       - Section 377 of IPC: \`[Section 377 of IPC](https://indiankanoon.org/doc/365636/)\`
       - Section 498A of IPC: \`[Section 498A of IPC](https://indiankanoon.org/doc/1236178/)\`
       - Specific Indian Case Law: Use the Indian Kanoon search format: \`[Case Name](https://indiankanoon.org/search/?formInput=case_name_with_plus_signs)\` (e.g., \`[Shreya Singhal v. Union of India](https://indiankanoon.org/search/?formInput=Shreya+Singhal+v+Union+of+India)\` or \`[Vishaka v. State of Rajasthan](https://indiankanoon.org/search/?formInput=Vishaka+v+State+of+Rajasthan)\`).
       - Generic Indian Search: \`[Indian Kanoon Search](https://indiankanoon.org/search/?formInput=query_with_plus_signs)\`.
    2. US Constitution/US Code/Cases:
       - Cornell Law US Code Search: \`[LII US Code Title X Section Y](https://www.law.cornell.edu/uscode/text/title_number/section_number)\` (e.g., \`[11 U.S.C. § 101](https://www.law.cornell.edu/uscode/text/11/101)\`).
       - US Constitution: \`[US Constitution](https://www.law.cornell.edu/constitution/)\`
       - General Legal Search (US): \`[LII Search](https://www.law.cornell.edu/search/site/query_with_plus_signs)\` or \`[GovInfo Search](https://www.govinfo.gov/app/search/%7B"query":"query_with_plus_signs"%7D)\`.
       - Specific US Case Law: \`[Case Name](https://www.google.com/search?q=case_name+legal+ruling)\` or similar reliable reference site.
  - Ensure every article number, code section, or case citation is accurate, proper, and relevant to the user's question.`,
  model,
});
