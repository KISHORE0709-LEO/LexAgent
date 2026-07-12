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

    // Ensure index exists for jurisdiction keyword filter
    try {
      await qdrant.createPayloadIndex(COLLECTION, {
        field_name: "jurisdiction",
        field_schema: "keyword",
      });
      console.log(`Verified/created Qdrant payload index for "jurisdiction" in collection "${COLLECTION}"`);
    } catch (e) {
      console.warn(`Could not ensure payload index for "jurisdiction" in "${COLLECTION}":`, e);
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

    // Ensure keyword indexes exist for filtered scrolls on 'type' and 'userId'.
    // Qdrant Cloud requires these indexes before using match filters.
    for (const field of ["type", "userId"]) {
      try {
        await qdrant.createPayloadIndex(SESSIONS_COLLECTION, {
          field_name: field,
          field_schema: "keyword",
        });
        console.log(`Verified/created Qdrant payload index for "${field}" in collection "${SESSIONS_COLLECTION}"`);
      } catch (e: any) {
        // 409 conflict means the index already exists — that's fine
        if (!e?.message?.includes("already exists") && e?.status !== 409) {
          console.warn(`Could not ensure payload index for "${field}" in "${SESSIONS_COLLECTION}":`, e);
        }
      }
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

    // Ensure index exists for jurisdiction keyword filter
    try {
      await qdrant.createPayloadIndex(POLICIES_COLLECTION, {
        field_name: "jurisdiction",
        field_schema: "keyword",
      });
      console.log(`Verified/created Qdrant payload index for "jurisdiction" in collection "${POLICIES_COLLECTION}"`);
    } catch (e) {
      console.warn(`Could not ensure payload index for "jurisdiction" in "${POLICIES_COLLECTION}":`, e);
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

// ---------- Reviewer Knowledge Collection ----------
export const REVIEWER_KNOWLEDGE_COLLECTION = "reviewer_knowledge";

/**
 * Ensures the reviewer knowledge collection exists in Qdrant.
 */
export async function ensureReviewerKnowledgeCollection() {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some((c) => c.name === REVIEWER_KNOWLEDGE_COLLECTION);

    if (exists) {
      // Check if dimension matches
      const info = await qdrant.getCollection(REVIEWER_KNOWLEDGE_COLLECTION);
      const currentSize = (info.config?.params?.vectors as any)?.size;

      if (currentSize !== EMBEDDING_DIM) {
        console.log(`Dimension mismatch in collection "${REVIEWER_KNOWLEDGE_COLLECTION}" (current: ${currentSize}, expected: ${EMBEDDING_DIM}). Recreating collection...`);
        await qdrant.deleteCollection(REVIEWER_KNOWLEDGE_COLLECTION);
        await qdrant.createCollection(REVIEWER_KNOWLEDGE_COLLECTION, {
          vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
        });
        console.log(`Recreated Qdrant collection "${REVIEWER_KNOWLEDGE_COLLECTION}" with dimension ${EMBEDDING_DIM}`);
      } else {
        console.log(`Qdrant collection "${REVIEWER_KNOWLEDGE_COLLECTION}" already exists with correct dimension`);
      }
    } else {
      await qdrant.createCollection(REVIEWER_KNOWLEDGE_COLLECTION, {
        vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
      });
      console.log(`Created Qdrant collection "${REVIEWER_KNOWLEDGE_COLLECTION}" with dimension ${EMBEDDING_DIM}`);
    }
  } catch (error) {
    console.error("Failed to ensure reviewer knowledge collection in Qdrant:", error);
    throw error;
  }
}

/**
 * Saves an approved/rejected clause to the Qdrant Reviewer Knowledge DB.
 */
export async function saveApprovedClause(
  clauseId: string,
  originalText: string,
  revisedText: string,
  jurisdiction: string,
  category: string,
  partnerReasoning: string,
  status: "approved" | "rejected" | "edited"
) {
  try {
    const textToEmbed = revisedText || originalText;
    const vector = await getEmbedding(textToEmbed);
    const id = generateDeterministicUUID(clauseId + "-" + Date.now() + "-" + Math.random());
    const payload = {
      id,
      clauseId,
      original_clause: originalText,
      approved_clause: revisedText,
      jurisdiction: jurisdiction.toLowerCase(),
      category: category.toLowerCase(),
      partner_reasoning: partnerReasoning,
      status,
      timestamp: Date.now(),
    };
    await qdrant.upsert(REVIEWER_KNOWLEDGE_COLLECTION, {
      points: [{ id, vector, payload }],
    });
    console.log(`Saved approved clause to Reviewer Knowledge DB: ${id} (status: ${status})`);
  } catch (error) {
    console.error("Failed to save approved clause to Reviewer Knowledge DB:", error);
    throw error;
  }
}

// ---------- Chat Sessions & Projects Persistence ----------

export type ChatSessionPayload = {
  type: "session";
  sessionId: string;
  userId: string;
  title: string;
  messages: any[];
  pinned: boolean;
  archived: boolean;
  projectId: string | null;
  timestamp: number;
};

export type ProjectPayload = {
  type: "project";
  projectId: string;
  userId: string;
  name: string;
  timestamp: number;
};

/**
 * Saves or updates a chat session in Qdrant.
 */
export async function saveChatSession(
  sessionId: string,
  userId: string,
  title: string,
  messages: any[],
  pinned: boolean,
  archived: boolean,
  projectId: string | null
) {
  try {
    const pointId = generateDeterministicUUID("session-" + sessionId);
    const dummyVector = new Array(EMBEDDING_DIM).fill(0);
    const payload: ChatSessionPayload = {
      type: "session",
      sessionId,
      userId,
      title,
      messages,
      pinned,
      archived,
      projectId,
      timestamp: Date.now(),
    };
    await qdrant.upsert(SESSIONS_COLLECTION, {
      points: [{ id: pointId, vector: dummyVector, payload }],
    });
    console.log(`Saved chat session memory to Qdrant: ${sessionId}`);
  } catch (error) {
    console.error(`Failed to save chat session ${sessionId} to Qdrant:`, error);
    throw error;
  }
}

/**
 * Lists all chat sessions for a given user.
 */
export async function listChatSessions(userId: string): Promise<ChatSessionPayload[]> {
  try {
    // Try filtered scroll first (requires 'type' and 'userId' indexes)
    try {
      const result = await qdrant.scroll(SESSIONS_COLLECTION, {
        filter: {
          must: [
            { key: "type", match: { value: "session" } },
            { key: "userId", match: { value: userId } },
          ],
        },
        limit: 100,
        with_payload: true,
      });
      return result.points.map((p) => p.payload as ChatSessionPayload);
    } catch (filterErr: any) {
      // If indexes are missing (400 Bad Request), fall back to in-memory filter
      console.warn("Filtered scroll failed (indexes may not exist yet), falling back to in-memory filter:", filterErr?.message);
      const result = await qdrant.scroll(SESSIONS_COLLECTION, {
        limit: 500,
        with_payload: true,
      });
      return result.points
        .map((p) => p.payload as any)
        .filter((p) => p?.type === "session" && p?.userId === userId) as ChatSessionPayload[];
    }
  } catch (error) {
    console.error(`Failed to scroll chat sessions for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Deletes a chat session by ID.
 */
export async function deleteChatSession(sessionId: string) {
  try {
    const pointId = generateDeterministicUUID("session-" + sessionId);
    await qdrant.delete(SESSIONS_COLLECTION, {
      points: [pointId],
    });
    console.log(`Deleted chat session from Qdrant: ${sessionId}`);
  } catch (error) {
    console.error(`Failed to delete chat session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Saves a project in Qdrant.
 */
export async function saveProject(projectId: string, userId: string, name: string) {
  try {
    const pointId = generateDeterministicUUID("project-" + projectId);
    const dummyVector = new Array(EMBEDDING_DIM).fill(0);
    const payload: ProjectPayload = {
      type: "project",
      projectId,
      userId,
      name,
      timestamp: Date.now(),
    };
    await qdrant.upsert(SESSIONS_COLLECTION, {
      points: [{ id: pointId, vector: dummyVector, payload }],
    });
    console.log(`Saved project to Qdrant: ${name}`);
  } catch (error) {
    console.error(`Failed to save project ${name} to Qdrant:`, error);
    throw error;
  }
}

/**
 * Lists all projects for a user.
 */
export async function listProjects(userId: string): Promise<ProjectPayload[]> {
  try {
    // Try filtered scroll first (requires 'type' and 'userId' indexes)
    try {
      const result = await qdrant.scroll(SESSIONS_COLLECTION, {
        filter: {
          must: [
            { key: "type", match: { value: "project" } },
            { key: "userId", match: { value: userId } },
          ],
          limit: 50,
          with_payload: true,
        } as any,
      });
      return result.points.map((p) => p.payload as ProjectPayload);
    } catch (filterErr: any) {
      console.warn("Filtered project scroll failed, falling back to in-memory filter:", filterErr?.message);
      const result = await qdrant.scroll(SESSIONS_COLLECTION, {
        limit: 500,
        with_payload: true,
      });
      return result.points
        .map((p) => p.payload as any)
        .filter((p) => p?.type === "project" && p?.userId === userId) as ProjectPayload[];
    }
  } catch (error) {
    console.error(`Failed to scroll projects for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Deletes a project by ID.
 */
export async function deleteProject(projectId: string) {
  try {
    const pointId = generateDeterministicUUID("project-" + projectId);
    await qdrant.delete(SESSIONS_COLLECTION, {
      points: [pointId],
    });
    console.log(`Deleted project from Qdrant: ${projectId}`);
  } catch (error) {
    console.error(`Failed to delete project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Saves user configuration (e.g. risk weights, thresholds) in Qdrant.
 */
export async function saveUserConfig(userId: string, config: any) {
  try {
    const pointId = generateDeterministicUUID("config-" + userId);
    const dummyVector = new Array(EMBEDDING_DIM).fill(0);
    const payload = {
      type: "config",
      userId,
      config,
      timestamp: Date.now(),
    };
    await qdrant.upsert(SESSIONS_COLLECTION, {
      points: [{ id: pointId, vector: dummyVector, payload }],
    });
    console.log(`Saved config to Qdrant for user: ${userId}`);
  } catch (error) {
    console.error(`Failed to save config for user ${userId} to Qdrant:`, error);
    throw error;
  }
}

/**
 * Retrieves user configuration from Qdrant.
 */
export async function getUserConfig(userId: string): Promise<any | null> {
  try {
    const pointId = generateDeterministicUUID("config-" + userId);
    const result = await qdrant.retrieve(SESSIONS_COLLECTION, {
      ids: [pointId],
    });
    if (result.length > 0 && result[0].payload) {
      return result[0].payload.config;
    }
    return null;
  } catch (error) {
    console.error(`Failed to retrieve config for user ${userId}:`, error);
    return null;
  }
}
