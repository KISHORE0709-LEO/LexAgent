import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";

export const COLLECTION = "legal_clauses";
const EMBEDDING_DIM = 768;

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false,
});

/**
 * Turns text into a vector. (Mocked for MVP to bypass Google API key restrictions on embeddings)
 * Generates a deterministic 768-dim vector based on the text length and character codes.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const dim = 768;
  const vector = new Array(dim).fill(0);
  
  // Create a somewhat unique but deterministic vector for this text
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    vector[i % dim] += charCode / 1000.0;
  }
  
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map(v => v / magnitude);
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
