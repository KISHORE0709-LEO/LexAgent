import { ensureCollection, upsertClause } from "../lib/qdrant.js";
import { PRECEDENTS } from "./precedents.js";
import { v4 as uuidv4 } from "uuid";

async function main() {
  console.log("Setting up Qdrant collection...");
  await ensureCollection();

  console.log(`Seeding ${PRECEDENTS.length} precedent clauses...`);
  for (const clause of PRECEDENTS) {
    const id = uuidv4();
    await upsertClause(id, clause.text, clause);
    console.log(`  + [${clause.jurisdiction}] ${clause.clauseType}`);
  }

  console.log("Done. Your precedent library is live in Qdrant.");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
