# Product Requirements Document (PRD): Legal Document Intelligence Agent

## 1. Executive Summary

The Legal Document Intelligence Agent is an enterprise-grade AI system that automates the analysis, benchmarking, and redrafting of complex legal contracts — eliminating the two most dangerous failure modes of generic AI in legal contexts: hallucinated citations and jurisdiction-blind clause recommendations. It serves law firms and corporate legal departments through a production-ready pipeline built on three deliberate technical pillars: **jurisdiction-aware hybrid retrieval via Qdrant** (ensuring every benchmarked clause is compared only against legally relevant precedents), **dual Enkrypt AI checkpoints with an automated regeneration loop** (blocking both adversarial inputs and legally inaccurate outputs before they reach any user), and a **human-in-the-loop governance workflow with Senior Partner Sign-off as a hard gate** for high-risk modifications — not an optional step, but an enforced approval node before any high-risk clause is committed back to the knowledge base.

---

## 2. Problem Statement

Legal document analysis is broken in three specific ways when naive AI is applied:

- **Hallucinated Citations:** Generic LLMs generate plausible-sounding but fabricated case law, misapply precedents, or confidently cite rulings that don't exist — a failure mode that is catastrophic in legal contexts where a single incorrect citation can invalidate a contract or expose a firm to liability.
- **Jurisdiction-Blind Benchmarking:** A "standard" indemnification clause in Delaware is not standard in California. Systems that perform semantic-only retrieval without jurisdiction scoping will confidently recommend clause language that is unenforceable or non-compliant in the user's actual legal region.
- **No Human Oversight or Learning Loop:** Existing tools produce a recommendation and stop. There is no structured mechanism to capture senior legal expertise, no transparency into why a clause was flagged, and no feedback loop that allows the system to improve from the firm's own legal judgment over time.

---

## 3. Goals & Objectives

- **Automate Clause Decomposition:** Reduce manual effort in breaking down 100+ page contracts into auditable, actionable clause-level data.
- **Zero-Tolerance Input Security:** Enforce PII redaction and prompt injection protection at the entry point — before any document content reaches an LLM.
- **Explainable Risk Assessment:** Provide lawyers with an Explainable Risk Breakdown Viewer that surfaces the exact retrieval results and confidence scores behind every AI-generated flag — not just a risk label.
- **Continuous Learning via Feedback Loop:** Implement a closed-loop system where Senior Partner edits and overrides are captured, structured, and used to recalibrate the agent's risk weights — creating a system that learns the firm's specific legal DNA over time.

---

## 4. Target Users / Stakeholders

- **Junior Associates:** Primary users for initial document ingestion, clause review, and editing via the Manual Review Portal.
- **Senior Partners:** Final authority node for high-risk escalations — required to provide a digital signature before any flagged-high-risk clause modification is committed.
- **Legal Operations / IT:** Administrators of the Risk Configuration Store and Policy Playbook Library — responsible for tuning risk appetite profiles and versioning internal policy.

---

## 5. Solution Architecture

The system is a multi-agent pipeline where each layer has a specific, non-overlapping responsibility:

### Mastra Multi-Agent Orchestration
Mastra manages stateful, multi-step transitions across three distinct agents — Document Ingest Workflow, Clause Analysis Agent, and Drafting Agent — using tool-calling and memory primitives to persist document context across a full session. The Clause Analysis Agent uses LangGraph-powered **Confidence Score Branching**: if retrieval confidence falls below threshold, the agent automatically routes to Manual Review rather than proceeding to drafting, preventing low-confidence outputs from ever reaching the user. Mastra's memory layer also stores a session-level contract context so users can ask follow-up questions about a previously ingested document without re-uploading.

### Qdrant Hybrid Search with Jurisdiction Filtering
Qdrant is configured for hybrid retrieval combining **OpenAI Embeddings** (dense semantic vectors) and **BM25** (keyword/term-of-art matching). This is critical for legal language: semantic search alone will conflate similar concepts across jurisdictions; BM25 ensures that exact statutory references, defined terms, and jurisdiction-specific terminology are never lost to embedding distance. Every retrieval query is **hard-filtered by a jurisdiction payload field** resolved during the Document Ingest step — meaning a contract governed by New York law is only benchmarked against New York-jurisdiction precedents, never against semantically similar but legally irrelevant clauses from other regions.

### Dual Enkrypt AI Checkpoints
Rather than a single safety layer, Enkrypt AI is deployed at two distinct checkpoints with different responsibilities:
- **Input Guard:** Intercepts the raw document stream before any LLM processing — performs PII redaction, detects prompt injection attempts, and validates document structure. The system does not proceed if this check fails.
- **Output Guard:** Validates the Drafting Agent's generated clause language against firm playbooks and the exact Qdrant retrieval set used to generate it. If the Output Guard detects a citation not present in the retrieved precedent set (hallucination), a jurisdiction mismatch between the draft and the resolved contract jurisdiction, or a policy bias flag — it triggers a **Regeneration Loop**, returning the draft to the Drafting Agent with specific failure context for a corrected attempt (max 3 attempts before human escalation). This is not a simple content filter; it is a logic-level consistency check on the agent's own reasoning.

---

## 6. Component Breakdown

- **Legal Web Client:** React/Tailwind/TypeScript interface for document upload, AI interaction, and review of flagged clauses and risk breakdowns.
- **Legal API Gateway:** FastAPI entry point managing request routing, authentication, and coordination between security layers and the Mastra orchestration core.
- **Enkrypt Input Guard:** Security service enforcing PII anonymization and adversarial input detection before any content reaches an LLM agent.
- **Document Ingest Workflow:** Parses contracts using Unstructured.io, applies clause-boundary-aware chunking (not fixed-size token windows), and runs a **JurisdictionDetector** step to extract the governing-law clause and resolve jurisdiction before any retrieval begins.
- **Clause Analysis Agent:** Decomposes contracts into clause-level units, retrieves semantically and jurisdictionally matching precedents from Qdrant, and applies **Outside Voting Analysis** — a multi-precedent weighting mechanism that flags clauses deviating from the majority position of retrieved standard-practice examples.
- **Drafting Agent:** Generates revised clause language using **Multi-Dimensional Weighting** across four axes: clause criticality, jurisdiction, firm policy alignment, and historical override data from the Reviewer Knowledge DB.
- **Enkrypt Output Guard:** Final compliance and accuracy gate performing jurisdiction consistency verification, hallucination detection against the retrieval set, policy regulation bias analysis, and contractual position validation. Failed checks trigger the regeneration loop.
- **Manual Review Portal:** Human-in-the-loop UI with inline editing, commenting, audit logging, and an Explainable Risk Breakdown Viewer that shows lawyers exactly which retrieved precedents drove each AI risk flag.
- **Senior Partner Sign-off:** Enforced approval node for high-risk escalations, integrated with a digital signature workflow. Edits at this stage are routed through a separate **Enkrypt Post-Edit validation** pass before being committed.
- **Qdrant Knowledge Layer — Four-Tier Stack:**
  - *Clause Collection:* Clause-level embeddings with jurisdiction, risk category, and source metadata. Hybrid search enabled.
  - *Precedent Library:* Standard-practice clause reference library with jurisdiction filtering and versioning.
  - *Long-term Memory:* Summarized session context per user for cross-session recall.
  - *Policy Store:* Internal firm playbooks and approved clause libraries with version control and regional scoping.
- **Qdrant Reviewer Knowledge DB:** Captures structured knowledge from Senior Partner edits — including the specific clause, the override rationale, and the jurisdiction — as training signal for the Risk Analytics Service.
- **Risk Analytics Service:** Python/Scikit-learn engine that analyzes human override patterns to identify systematic misalignments between agent risk scores and partner judgments, then generates weight recalibration suggestions.
- **Risk Configuration Store:** PostgreSQL/JSON store for firm-level risk appetite profiles and configurable weighting parameters used by the Drafting Agent.

---

## 7. Key Technical Decisions & Rationale

- **Why Jurisdiction-Aware Retrieval?** Legal standards are jurisdiction-specific by definition. A "Standard of Care" clause that is market-standard in the UK may be unenforceable in California. Jurisdiction-blind semantic retrieval will confidently recommend clause language that is legally inappropriate in the user's actual legal region — and the user may not know the difference. Scoping every retrieval query to the resolved jurisdiction is the only technically honest approach to clause benchmarking.

- **Why Dual Enkrypt Checkpoints Instead of One?** A single guardrail forces a false choice: place it at input (security) or output (accuracy). The Input Guard and Output Guard have fundamentally different jobs. The Input Guard protects the *system* from adversarial content. The Output Guard protects the *client* from legally inaccurate AI recommendations. Collapsing them into one checkpoint means one of those jobs will be done poorly.

- **Why the Regeneration Loop over Simple Blocking?** A blocked output with no recovery path means the system fails silently and the user gets nothing. The regeneration loop sends the specific failure reason (hallucinated citation, jurisdiction mismatch, policy flag) back to the Drafting Agent as corrective context — giving the agent a concrete target for improvement rather than just a rejection signal.

- **Why Senior Partner Sign-off as a Hard Gate?** High-risk edits (liability caps, indemnification carve-outs, IP ownership clauses) require a categorically different level of legal authority. Making this gate optional or advisory defeats its purpose. The system enforces it as a non-bypassable approval node — any high-risk flagged clause cannot be committed to the knowledge base without a partner digital signature.

- **Why Hybrid Search over Pure Semantic Retrieval?** Legal language relies on precise terms of art. Pure semantic search treats "consequential damages waiver" and "indirect loss exclusion" as similar — they are legally distinct. BM25 ensures exact statutory references, defined terms, and jurisdiction-specific terminology are matched precisely, while dense vector search handles conceptual similarity. For legal retrieval, you need both.

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Tailwind CSS, TypeScript |
| Backend | FastAPI (Python), Mastra, LangGraph |
| AI Safety | Enkrypt AI (Input + Output Guard) |
| Embeddings | OpenAI Embeddings + BM25 |
| Vector DB | Qdrant (Hybrid Search, Jurisdiction Filtering) |
| Relational DB | PostgreSQL (Risk Config, Metadata) |
| Analytics | Scikit-learn, Python |
| Document Parsing | Unstructured.io |

---

## 9. Data Flow (End-to-End)

1. **Upload:** User uploads a contract via the Legal Web Client.
2. **Input Validation:** Enkrypt Input Guard redacts PII and checks for prompt injections. Pipeline halts if this fails.
3. **Ingestion & Jurisdiction Resolution:** Mastra Document Ingest Workflow parses the contract using Unstructured.io, applies clause-boundary-aware chunking, and runs the JurisdictionDetector to extract the governing-law clause (e.g., "New York"). If jurisdiction cannot be resolved, the pipeline pauses and prompts the user for manual input — it does not proceed with a guess.
4. **Clause Analysis:** Clause Analysis Agent queries Qdrant Clause Collection and Precedent Library with a jurisdiction-hard-filtered hybrid search. Outside Voting Analysis flags clauses deviating from the majority retrieved position.
5. **Drafting:** Drafting Agent generates revised clause language using Multi-Dimensional Weighting across criticality, jurisdiction, policy, and historical override data.
6. **Output Validation:** Enkrypt Output Guard checks the draft for hallucinated citations (cross-referenced against the actual Qdrant retrieval set), jurisdiction consistency, and policy bias. Failures trigger the regeneration loop (max 3 attempts). After 3 failures, escalated to human review.
7. **Human Review:** Low-risk outputs are surfaced in the Manual Review Portal with Explainable Risk Breakdown. High-risk outputs are escalated to Senior Partner Sign-off.
8. **Senior Approval:** Partner reviews the Explainable Risk Breakdown, edits if necessary, and provides a digital signature. The edited clause passes through Enkrypt Post-Edit validation before commitment.
9. **Knowledge Capture:** Reviewer Knowledge DB captures the partner's edit and rationale. Risk Analytics Service analyzes override patterns and updates Risk Configuration Store weights — closing the learning loop.

---

## 10. Risk Mitigations

| Risk | Mitigation |
|---|---|
| Hallucinated legal citation | Enkrypt Output Guard cross-references every citation against the actual Qdrant retrieval set. Failures trigger regeneration loop (max 3 attempts), then human escalation. |
| Undetectable jurisdiction | JurisdictionDetector flags the ambiguity; pipeline pauses and prompts user for manual clarification. System never silently defaults to a wrong jurisdiction. |
| Contradictory precedents | Clause Analysis Agent applies Conflict Resolution Logic — prioritizes the most recent precedent within jurisdiction, weighted by Confidence Score. Both precedents are surfaced to the reviewer with an explicit contradiction flag. |
| Adversarial document input | Enkrypt Input Guard intercepts at the gateway level before any LLM contact. |
| Partner edit introduces new risk | Enkrypt Post-Edit validation pass on all Senior Partner modifications before commitment to knowledge base. |

---

## 11. Success Metrics

- **Hallucination Rate:** Target <0.5% on cited precedents, measured by Enkrypt Output Guard detection logs.
- **Review Efficiency:** 50% reduction in time spent by Junior Associates on initial clause benchmarking (baseline: manual review of standard 50-page NDA).
- **Jurisdiction Accuracy:** >98% correct jurisdiction resolution on contracts with a governing-law clause.
- **Model Recalibration:** Measurable convergence between AI risk scores and Senior Partner overrides within a 90-day feedback window.

---

## 12. Why This Wins

This architecture wins because it addresses the three specific failure modes of naive legal AI — hallucination, jurisdiction blindness, and no learning loop — with three concrete, non-generic technical solutions. Enkrypt AI's dual checkpoints are not decorative safety theater; they perform logic-level consistency verification against the agent's own retrieval set. Qdrant's jurisdiction filtering is not a metadata tag bolted on after the fact; it is a hard query constraint applied before retrieval, making jurisdiction-blind results technically impossible. The Senior Partner Sign-off is not a UI feature; it is an enforced approval gate wired into the knowledge commit pipeline. And the Risk Analytics feedback loop means the system does not stay static — it learns the specific legal DNA of the firm it serves, compounding in accuracy with every senior override it captures. This is not a RAG wrapper with a chat interface. It is a production-grade legal intelligence system designed for the specific failure modes of the legal domain.
