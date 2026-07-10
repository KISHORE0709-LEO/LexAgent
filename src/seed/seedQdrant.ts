import {
  qdrant,
  COLLECTION,
  ensureCollection,
  getEmbedding,
  POLICIES_COLLECTION,
  ensurePolicyCollection,
  generateDeterministicUUID,
} from "../lib/qdrant.js";
import { PRECEDENTS } from "./precedents.js";
import { POLICIES } from "./policies.js";

async function main() {
  // ---------- 1. Seed Precedents ----------
  try {
    console.log(`Deleting existing Qdrant collection "${COLLECTION}" to start fresh...`);
    await qdrant.deleteCollection(COLLECTION);
    console.log(`Successfully deleted collection "${COLLECTION}"`);
  } catch (err) {
    console.log(`Collection "${COLLECTION}" did not exist or could not be deleted, proceeding to recreate.`);
  }

  console.log("Re-creating Qdrant precedents collection...");
  await ensureCollection();

  const totalPrecedents = PRECEDENTS.length;
  console.log(`Seeding ${totalPrecedents} precedent clauses in batches of 20...`);
  
  const batchSize = 20;
  let totalPrecedentsInserted = 0;

  for (let i = 0; i < totalPrecedents; i += batchSize) {
    const batch = PRECEDENTS.slice(i, i + batchSize);
    console.log(`Processing precedents batch of ${batch.length} clauses (${i + 1} to ${Math.min(i + batchSize, totalPrecedents)})...`);

    const points = await Promise.all(
      batch.map(async (clause) => {
        const id = generateDeterministicUUID(clause.clauseText);
        const vector = await getEmbedding(clause.clauseText);
        
        const normalizedPayload = {
          ...clause,
          id,
          jurisdiction: clause.jurisdiction.toLowerCase(),
        };

        return {
          id,
          vector,
          payload: normalizedPayload,
        };
      })
    );

    await qdrant.upsert(COLLECTION, { points });
    totalPrecedentsInserted += points.length;
    console.log(`  Successfully batch-upserted ${points.length} precedents.`);
  }

  console.log(`Done. Successfully seeded a total of ${totalPrecedentsInserted} precedents to Qdrant.\n`);

  // ---------- 2. Seed Playbook Policies ----------
  try {
    console.log(`Deleting existing Qdrant collection "${POLICIES_COLLECTION}" to start fresh...`);
    await qdrant.deleteCollection(POLICIES_COLLECTION);
    console.log(`Successfully deleted collection "${POLICIES_COLLECTION}"`);
  } catch (err) {
    console.log(`Collection "${POLICIES_COLLECTION}" did not exist or could not be deleted, proceeding to recreate.`);
  }

  console.log("Re-creating Qdrant policies collection...");
  await ensurePolicyCollection();

  const totalPolicies = POLICIES.length;
  console.log(`Seeding ${totalPolicies} playbook policies in batches of 20...`);
  
  let totalPoliciesInserted = 0;

  for (let i = 0; i < totalPolicies; i += batchSize) {
    const batch = POLICIES.slice(i, i + batchSize);
    console.log(`Processing policies batch of ${batch.length} items (${i + 1} to ${Math.min(i + batchSize, totalPolicies)})...`);

    const points = await Promise.all(
      batch.map(async (policy) => {
        const vector = await getEmbedding(policy.category + " - " + policy.policyText);
        
        const normalizedPayload = {
          ...policy,
          jurisdiction: policy.jurisdiction.toLowerCase(),
          category: policy.category.toLowerCase(),
        };

        const pointId = generateDeterministicUUID(policy.id);
        return {
          id: pointId,
          vector,
          payload: normalizedPayload,
        };
      })
    );

    await qdrant.upsert(POLICIES_COLLECTION, { points });
    totalPoliciesInserted += points.length;
    console.log(`  Successfully batch-upserted ${points.length} policies.`);
  }

  console.log(`Done. Successfully seeded a total of ${totalPoliciesInserted} playbook policies to Qdrant.`);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
