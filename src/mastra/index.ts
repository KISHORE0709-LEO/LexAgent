import { Mastra } from "@mastra/core/mastra";
import { legalDocumentWorkflow } from "./workflows/legalWorkflow.js";

export const mastra = new Mastra({
  workflows: { legalDocumentWorkflow },
});
