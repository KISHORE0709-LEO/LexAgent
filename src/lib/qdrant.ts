import { QdrantClient } from "@qdrant/js-client-rest";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { v4 as uuidv4 } from "uuid";
import * as crypto from "crypto";
import "dotenv/config";

export const COLLECTION = "legal_clauses";
const EMBEDDING_DIM = 1536;

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false,
});

// Configure AWS Bedrock Client
const awsConfig: any = {
  region: process.env.AWS_REGION || "us-east-1",
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  awsConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const bedrockClient = new BedrockRuntimeClient(awsConfig);

/**
 * Turns text into a vector using Amazon Titan Embed model via AWS Bedrock.
 * Generates a real 1536-dimensional vector.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const payload = {
      inputText: text,
    };

    const command = new InvokeModelCommand({
      modelId: "amazon.titan-embed-text-v1",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    if (!responseBody.embedding || !Array.isArray(responseBody.embedding)) {
      throw new Error("Titan embedding response is missing embedding vector");
    }

    return responseBody.embedding;
  } catch (error) {
    console.error("Failed to generate embedding using AWS Bedrock:", error);
    throw error;
  }
}

/**
 * Creates the collection if it doesn't already exist.
 * Recreates the collection if the dimension does not match.
 * Run once via `npm run seed`.
 */
export async function ensureCollection() {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION);

    if (exists) {
      // Check if dimension matches
      const info = await qdrant.getCollection(COLLECTION);
      const currentSize = (info.config?.params?.vectors as any)?.size;

      if (currentSize !== EMBEDDING_DIM) {
        console.log(`Dimension mismatch in collection "${COLLECTION}" (current: ${currentSize}, expected: ${EMBEDDING_DIM}). Recreating collection...`);
        await qdrant.deleteCollection(COLLECTION);
        await qdrant.createCollection(COLLECTION, {
          vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
        });
        console.log(`Recreated Qdrant collection "${COLLECTION}" with dimension ${EMBEDDING_DIM}`);
      } else {
        console.log(`Qdrant collection "${COLLECTION}" already exists with correct dimension`);
      }
    } else {
      await qdrant.createCollection(COLLECTION, {
        vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
      });
      console.log(`Created Qdrant collection "${COLLECTION}" with dimension ${EMBEDDING_DIM}`);
    }
  } catch (error) {
    console.error("Failed to ensure collection in Qdrant:", error);
    throw error;
  }
}

export type ClausePayload = {
  id: string;
  jurisdiction: string;
  category: string;
  clauseText: string;
  riskLevel: "low" | "medium" | "high";
  standardPractice: boolean;
  notes: string;
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

// ---------- Long-term Session Memory Collection ----------
export const SESSIONS_COLLECTION = "legal_sessions";

/**
 * Ensures the session memory collection exists in Qdrant.
 */
export async function ensureSessionCollection() {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some((c) => c.name === SESSIONS_COLLECTION);

    if (exists) {
      // Check if dimension matches
      const info = await qdrant.getCollection(SESSIONS_COLLECTION);
      const currentSize = (info.config?.params?.vectors as any)?.size;

      if (currentSize !== EMBEDDING_DIM) {
        console.log(`Dimension mismatch in collection "${SESSIONS_COLLECTION}" (current: ${currentSize}, expected: ${EMBEDDING_DIM}). Recreating collection...`);
        await qdrant.deleteCollection(SESSIONS_COLLECTION);
        await qdrant.createCollection(SESSIONS_COLLECTION, {
          vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
        });
        console.log(`Recreated Qdrant collection "${SESSIONS_COLLECTION}" with dimension ${EMBEDDING_DIM}`);
      } else {
        console.log(`Qdrant collection "${SESSIONS_COLLECTION}" already exists with correct dimension`);
      }
    } else {
      await qdrant.createCollection(SESSIONS_COLLECTION, {
        vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
      });
      console.log(`Created Qdrant collection "${SESSIONS_COLLECTION}" with dimension ${EMBEDDING_DIM}`);
    }
  } catch (error) {
    console.error("Failed to ensure session collection in Qdrant:", error);
    throw error;
  }
}

/**
 * Stores a session's summary and findings as a vector with metadata.
 */
export async function saveSessionMemory(
  sessionId: string,
  contractSummary: string,
  jurisdiction: string,
  keyFindings: string[]
) {
  try {
    const vector = await getEmbedding(contractSummary);
    const id = uuidv4();
    const payload = {
      sessionId,
      contractSummary,
      jurisdiction,
      keyFindings,
      timestamp: Date.now(),
    };
    await qdrant.upsert(SESSIONS_COLLECTION, {
      points: [{ id, vector, payload }],
    });
    console.log(`Saved session memory for session "${sessionId}" with ID ${id}`);
  } catch (error) {
    console.error(`Failed to save session memory for session "${sessionId}":`, error);
    throw error;
  }
}

/**
 * Retrieves the most recent 3 sessions for a given session ID.
 */
export async function recallSessionMemory(sessionId: string) {
  try {
    const result = await qdrant.scroll(SESSIONS_COLLECTION, {
      filter: {
        must: [{ key: "sessionId", match: { value: sessionId } }],
      },
      limit: 10,
      with_payload: true,
    });

    // Sort by timestamp descending and return top 3
    return result.points
      .map((p) => p.payload)
      .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 3);
  } catch (error) {
    console.error(`Failed to recall session memory for session "${sessionId}":`, error);
    throw error;
  }
}

// ---------- Firm Policies Collection ----------
export const POLICIES_COLLECTION = "legal_policies";

export type PolicyPayload = {
  id: string;
  jurisdiction: string;
  category: string;
  policyText: string;
  approvedLanguage: string;
  riskRules: string;
  notes?: string;
};

/**
 * Ensures the firm policies collection exists in Qdrant.
 */
export async function ensurePolicyCollection() {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some((c) => c.name === POLICIES_COLLECTION);

    if (exists) {
      // Check if dimension matches
      const info = await qdrant.getCollection(POLICIES_COLLECTION);
      const currentSize = (info.config?.params?.vectors as any)?.size;

      if (currentSize !== EMBEDDING_DIM) {
        console.log(`Dimension mismatch in collection "${POLICIES_COLLECTION}" (current: ${currentSize}, expected: ${EMBEDDING_DIM}). Recreating collection...`);
        await qdrant.deleteCollection(POLICIES_COLLECTION);
        await qdrant.createCollection(POLICIES_COLLECTION, {
          vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
        });
        console.log(`Recreated Qdrant collection "${POLICIES_COLLECTION}" with dimension ${EMBEDDING_DIM}`);
      } else {
        console.log(`Qdrant collection "${POLICIES_COLLECTION}" already exists with correct dimension`);
      }
    } else {
      await qdrant.createCollection(POLICIES_COLLECTION, {
        vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
      });
      console.log(`Created Qdrant collection "${POLICIES_COLLECTION}" with dimension ${EMBEDDING_DIM}`);
    }
  } catch (error) {
    console.error("Failed to ensure policy collection in Qdrant:", error);
    throw error;
  }
}

// Helper to generate a deterministic UUID from text
export function generateDeterministicUUID(text: string): string {
  const hash = crypto.createHash("md5").update(text).digest("hex");
  // Formats to 8-4-4-4-12 UUID layout
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join("-");
}

/**
 * Adds a new policy to the firm playbook.
 */
export async function upsertPolicy(policy: PolicyPayload) {
  try {
    const vector = await getEmbedding(policy.category + " - " + policy.policyText);
    const normalizedPayload = {
      ...policy,
      jurisdiction: policy.jurisdiction.toLowerCase(),
      category: policy.category.toLowerCase(),
    };
    const pointId = generateDeterministicUUID(policy.id);
    await qdrant.upsert(POLICIES_COLLECTION, {
      points: [{ id: pointId, vector, payload: normalizedPayload }],
    });
  } catch (error) {
    console.error(`Failed to upsert policy with ID ${policy.id} to Qdrant:`, error);
    throw error;
  }
}

/**
 * Retrieves relevant firm policies for a given category and jurisdiction.
 */
export async function searchPoliciesByCategory(
  category: string,
  jurisdiction: string,
  limit = 5
) {
  try {
    const vector = await getEmbedding(category);
    const result = await qdrant.search(POLICIES_COLLECTION, {
      vector,
      limit,
      filter: {
        must: [
          { key: "jurisdiction", match: { value: jurisdiction.toLowerCase() } }
        ],
      },
      with_payload: true,
    });
    return result.map((r) => ({
      score: r.score,
      ...(r.payload as unknown as PolicyPayload),
    }));
  } catch (error) {
    console.error(`Failed to search policies for category "${category}" in jurisdiction "${jurisdiction}":`, error);
    throw error;
  }
}
