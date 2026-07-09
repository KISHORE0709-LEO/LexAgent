import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

export const COLLECTION = "legal_clauses";
const EMBEDDING_MODEL = "text-embedding-004";
const EMBEDDING_DIM = 768; // Google text-embedding-004 outputs 768 dimensions

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

/**
 * Turns text into a vector using Google's free text-embedding-004 model.
 * This is what lets Qdrant do "semantic" search — it compares meaning,
 * not just exact keywords. Google AI Studio provides this for free.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Creates the collection if it doesn't already exist.
 * Run once via `npm run seed`.
 */
export async function ensureCollection() {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION);
  if (!exists) {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
    });
    console.log(`Created Qdrant collection "${COLLECTION}"`);
  } else {
    console.log(`Qdrant collection "${COLLECTION}" already exists`);
  }
}

export type ClausePayload = {
  clauseType: string; // e.g. "indemnification", "limitation_of_liability"
  jurisdiction: string; // e.g. "New York", "California", "Delaware"
  text: string;
  riskLevel: "low" | "medium" | "high";
  source: string; // e.g. "standard-practice-library"
};

export async function upsertClause(id: string, text: string, payload: ClausePayload) {
  const vector = await getEmbedding(text);
  await qdrant.upsert(COLLECTION, {
    points: [{ id, vector, payload }],
  });
}

/**
 * THE key differentiator vs. plain ChatGPT: this search is HARD-FILTERED
 * by jurisdiction. A New York contract will never be compared against
 * California-only precedent, even if the wording looks similar.
 */
export async function searchClausesByJurisdiction(
  queryText: string,
  jurisdiction: string,
  limit = 5
) {
  const vector = await getEmbedding(queryText);
  const result = await qdrant.search(COLLECTION, {
    vector,
    limit,
    filter: {
      must: [{ key: "jurisdiction", match: { value: jurisdiction } }],
    },
    with_payload: true,
  });
  return result.map((r) => ({
    score: r.score,
    ...(r.payload as unknown as ClausePayload),
  }));
}
