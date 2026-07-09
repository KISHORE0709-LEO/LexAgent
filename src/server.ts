import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { mastra } from "./mastra/index.js";

const app = new Hono();

app.get("/", async (c) => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf-8");
  return c.html(html);
});

app.post("/api/analyze", async (c) => {
  const body = await c.req.json<{ contractText: string }>();
  if (!body.contractText || body.contractText.trim().length < 20) {
    return c.json({ error: "Please provide contract text (at least 20 characters)." }, 400);
  }

  try {
    const workflow = mastra.getWorkflow("legalDocumentWorkflow");
    const run = await workflow.createRun();
    const result = await run.start({ inputData: { contractText: body.contractText } });

    if (result.status === "success") {
      return c.json({ status: "success", data: result.result });
    }
    if (result.status === "failed") {
      return c.json({ status: "failed", error: String(result.error) }, 422);
    }
    return c.json({ status: result.status });
  } catch (err) {
    return c.json({ status: "failed", error: (err as Error).message }, 422);
  }
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Legal Document Intelligence Agent running at http://localhost:${port}`);
});
