import { QdrantClient } from "@qdrant/js-client-rest";
import { google } from "@ai-sdk/google";
import { embed } from "ai";
import "dotenv/config";

export const COLLECTION = "legal_clauses";
const EMBEDDING_DIM = 768;

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false,
});

/**
 * Turns text into a vector using Google's embedding model.
 * Falls back to gemini-embedding-001 if text-embedding-004 is retired/returns 404.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: google.embedding("text-embedding-004"),
      value: text,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIM,
        },
      },
    });
    return embedding;
  } catch (error) {
    console.warn(`Failed to embed using text-embedding-004: ${(error as Error).message}. Falling back to gemini-embedding-001.`);
    const { embedding } = await embed({
      model: google.embedding("gemini-embedding-001"),
      value: text,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIM,
        },
      },
    });
    return embedding;
  }
}

/**
 * Creates the collection if it doesn't already exist.
 * Run once via `npm run seed`.
 */
export async function ensureCollection() {
  try {
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
  } catch (error) {
    console.error("Failed to ensure collection in Qdrant:", error);
    throw error;
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
  try {
    const vector = await getEmbedding(text);
    const normalizedPayload = {
      ...payload,
      jurisdiction: payload.jurisdiction.toLowerCase(),
    };
    await qdrant.upsert(COLLECTION, {
      points: [{ id, vector, payload: normalizedPayload }],
    });
  } catch (error) {
    console.error(`Failed to upsert clause with ID ${id} to Qdrant:`, error);
    throw error;
  }
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
  try {
    const vector = await getEmbedding(queryText);
    const result = await qdrant.search(COLLECTION, {
      vector,
      limit,
      filter: {
        must: [{ key: "jurisdiction", match: { value: jurisdiction.toLowerCase() } }],
      },
      with_payload: true,
    });
    return result.map((r) => ({
      score: r.score,
      ...(r.payload as unknown as ClausePayload),
    }));
  } catch (error) {
    console.error(`Failed to search clauses for jurisdiction "${jurisdiction}" in Qdrant:`, error);
    throw error;
  }
}

