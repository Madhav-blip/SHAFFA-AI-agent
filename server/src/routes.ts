import { Router } from "express";
import { z } from "zod";
import { Task, Memory, Goal, Automation, CommandLog } from "./models.js";
import { memoryEngine } from "./services/memoryEngine.js";
import { runAgentPipeline } from "./services/agents.js";

export const apiRouter = Router();

/* ---------- Tasks ---------- */
apiRouter.get("/tasks", async (_req, res) => res.json(await Task.find().sort({ due: 1 })));
apiRouter.post("/tasks", async (req, res) => res.status(201).json(await Task.create(req.body)));
apiRouter.patch("/tasks/:id", async (req, res) =>
  res.json(await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })),
);
apiRouter.delete("/tasks/:id", async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

/* ---------- Memory (vector search backed) ---------- */
apiRouter.get("/memory/search", async (req, res) => {
  const q = String(req.query.q ?? "");
  res.json(q ? await memoryEngine.search(q, 12) : await Memory.find().sort({ updatedAt: -1 }).limit(50));
});
apiRouter.post("/memory", async (req, res) => res.status(201).json(await memoryEngine.store(req.body)));
apiRouter.patch("/memory/:id", async (req, res) =>
  res.json(await Memory.findByIdAndUpdate(req.params.id, req.body, { new: true })),
);
apiRouter.delete("/memory/:id", async (req, res) => {
  await Memory.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

/* ---------- Goals + automations ---------- */
apiRouter.get("/goals", async (_req, res) => res.json(await Goal.find()));
apiRouter.patch("/goals/:id", async (req, res) =>
  res.json(await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true })),
);
apiRouter.get("/automations", async (_req, res) => res.json(await Automation.find()));
apiRouter.patch("/automations/:id", async (req, res) =>
  res.json(await Automation.findByIdAndUpdate(req.params.id, req.body, { new: true })),
);

/* ---------- AI command endpoint (RAG + tool calling) ---------- */
const CommandBody = z.object({ input: z.string().min(1), sessionId: z.string().optional() });

apiRouter.post("/ai/command", async (req, res) => {
  const parsed = CommandBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const started = Date.now();
  const result = await runAgentPipeline(parsed.data.input);

  await CommandLog.create({
    input: parsed.data.input,
    intent: result.intent,
    toolCalls: result.toolCalls,
    response: result.text,
    latencyMs: Date.now() - started,
  });

  res.json(result);
});
