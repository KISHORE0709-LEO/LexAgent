import { QdrantClient } from "@qdrant/js-client-rest";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
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
