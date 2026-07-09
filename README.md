# Legal Document Intelligence Agent
HiDevs × Mastra Hackathon 2026 — Team KekaCoders

## What this actually does, in plain English

1. You paste in a contract.
2. **Enkrypt AI (Input Guard)** checks the text isn't malicious or trying to
   trick the AI, before anything else happens.
3. An agent reads the contract and figures out which state's law governs it
   (e.g. "This Agreement shall be governed by California law").
4. The contract is split into individual clauses.
5. For each clause, **Qdrant** searches a library of example clauses —
   but ONLY clauses from the *same state* (jurisdiction-filtered search).
   This is the part a plain ChatGPT prompt can't do: it has no real filing
   cabinet, and it doesn't know to only compare California clauses against
   other California clauses.
6. An agent compares the clause to what it found and flags it low/medium/high risk.
7. For anything risky, another agent drafts a safer replacement clause,
   grounded only in the examples that were actually retrieved.
8. **Enkrypt AI (Output Guard)** checks that draft for made-up citations,
   bias, or policy violations. If it fails, the draft goes back to step 7
   with the specific failure reason — this is the "regeneration loop" and
   it will happen live in your demo, which is your strongest visual proof
   that the safety layer is real and not decorative.
9. You (acting as the reviewing lawyer) see every flagged clause with the
   exact precedents that drove the flag, and an Approve button.

## Setup (do this today)

1. **Get three free accounts / keys:**
   - OpenAI: https://platform.openai.com (for embeddings + the LLM reasoning)
   - Qdrant Cloud free cluster: https://cloud.qdrant.io
   - Enkrypt AI: https://app.enkryptai.com

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Copy `.env.example` to `.env` and fill in your real keys.**

4. **Seed the fake "law firm knowledge base" into Qdrant:**
   ```bash
   npm run seed
   ```
   This loads ~20 sample precedent clauses across New York and California
   into Qdrant. In a 3-day hackathon, this stands in for a real firm's
   clause library — that's a totally normal and expected shortcut, just
   say so out loud in your demo narration.

5. **Run the app:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 — there's a sample California contract
   pre-filled in the textbox so you can test immediately.

## What's real vs. simplified (be upfront about this to judges — it builds trust)

| Feature | Status |
|---|---|
| Mastra multi-step workflow orchestration | Real |
| Qdrant jurisdiction-filtered hybrid-ish search (semantic) | Real |
| Enkrypt AI Input Guard | Real |
| Enkrypt AI Output Guard + regeneration loop | Real |
| Hallucination cross-check against retrieval set | Real, but custom-built (Enkrypt's native hallucination detector is marked "coming soon" in their docs as of this build) |
| Senior Partner Sign-off | Simplified to an Approve button — no real digital signature service |
| Risk Analytics / ML recalibration from overrides | Not built — mention it as your "next step" roadmap item |
| BM25 keyword search alongside semantic | Not built — semantic-only for now; mention as roadmap if asked |
| PostgreSQL config store | Simplified to a TypeScript file |

## Next 3 days — build order

- **Today:** get all 3 API keys, run `npm run seed`, confirm the app runs
  end to end on the sample contract.
- **Tomorrow:** test with 2-3 more real contract excerpts (NDA, service
  agreement). Fix any JSON-parsing issues from the LLM agents (add
  `response_format: json_object` type constraints if you see raw text
  breaking `JSON.parse`).
- **Day after:** record your demo video showing the regeneration loop
  firing at least once, clean up the GitHub repo, write the project
  description, deploy (Railway, Render, or Fly.io are the fastest for a
  Node/Hono app like this).
- **Finale day:** rehearse a 2-minute pitch that leads with "watch what
  happens when the AI tries to cite something it can't back up" and shows
  the regeneration loop live.

## Notes on the TypeScript-only rule

This hackathon requires TypeScript end to end. This build uses Hono +
Node instead of the PRD's original FastAPI/Python backend, and Mastra's
own workflow branching instead of LangGraph, to stay compliant.
