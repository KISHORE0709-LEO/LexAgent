import { qdrant, COLLECTION, ensureCollection, getEmbedding } from "../lib/qdrant.js";
import { PRECEDENTS } from "./precedents.js";
import * as crypto from "crypto";

function generateDeterministicUUID(text: string): string {
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

async function main() {
  try {
    console.log(`Deleting existing Qdrant collection "${COLLECTION}" to start fresh...`);
    await qdrant.deleteCollection(COLLECTION);
    console.log(`Successfully deleted collection "${COLLECTION}"`);
  } catch (err) {
    console.log(`Collection "${COLLECTION}" did not exist or could not be deleted, proceeding to recreate.`);
  }

  console.log("Re-creating Qdrant collection...");
  await ensureCollection();

  const totalPrecedents = PRECEDENTS.length;
  console.log(`Seeding ${totalPrecedents} precedent clauses in batches of 20...`);
  
  const batchSize = 20;
  let totalInserted = 0;

  for (let i = 0; i < totalPrecedents; i += batchSize) {
    const batch = PRECEDENTS.slice(i, i + batchSize);
    console.log(`Processing batch of ${batch.length} clauses (${i + 1} to ${Math.min(i + batchSize, totalPrecedents)})...`);

    // Map each clause in the batch to a Qdrant point with a deterministic ID and real embedding
    const points = await Promise.all(
      batch.map(async (clause) => {
        const id = generateDeterministicUUID(clause.clauseText);
        const vector = await getEmbedding(clause.clauseText);
        
        // Normalize payload jurisdiction to lowercase
        const normalizedPayload = {
          ...clause,
          id, // use the generated deterministic ID
          jurisdiction: clause.jurisdiction.toLowerCase(),
        };

        return {
          id,
          vector,
          payload: normalizedPayload,
        };
      })
    );

    // Upsert the batch of points
    await qdrant.upsert(COLLECTION, { points });
    totalInserted += points.length;
    console.log(`  Successfully batch-upserted ${points.length} clauses.`);
  }

  console.log(`Done. Successfully seeded a total of ${totalInserted} clauses to Qdrant.`);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
