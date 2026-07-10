import { ensureCollection, upsertClause } from "../lib/qdrant.js";
import { PRECEDENTS } from "./precedents.js";

async function main() {
  console.log("Setting up Qdrant collection...");
  await ensureCollection();

  console.log(`Seeding ${PRECEDENTS.length} precedent clauses...`);
  for (const clause of PRECEDENTS) {
    await upsertClause(clause.id, clause.clauseText, clause);
    console.log(`  + [${clause.jurisdiction}] ${clause.category}`);
  }

  console.log("Done. Your precedent library is live in Qdrant.");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
