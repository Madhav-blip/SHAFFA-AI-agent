import Anthropic from "@anthropic-ai/sdk";
import { Task, Goal, Automation } from "./../models.js";
import { memoryEngine } from "./memoryEngine.js";
import { pcAutomation } from "./pcAutomation.js";

/**
 * Agent pipeline — planner routes each command to a specialist agent,
 * every agent shares one tool belt, and all runs are RAG-grounded with
 * memories retrieved for the input.
 *
 *   planner    → intent classification + multi-step plans
 *   coding     → explain / debug / generate against the repo index
 *   research   → web + docs lookups, summarization
 *   automation → create/modify triggers, run PC-level actions
 */
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOOLS: Anthropic.Tool[] = [
  {
    name: "create_task",
    description: "Create a task for the user",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        category: { type: "string", enum: ["College", "DSA", "Internship", "Personal", "Fitness"] },
        due: { type: "string", description: "ISO date" },
        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
      },
      required: ["title"],
    },
  },
  {
    name: "update_goal",
    description: "Log progress on a goal",
    input_schema: {
      type: "object",
      properties: { goalId: { type: "string" }, amount: { type: "number" } },
      required: ["goalId", "amount"],
    },
  },
  {
    name: "toggle_automation",
    description: "Enable or disable an automation",
    input_schema: {
      type: "object",
      properties: { automationId: { type: "string" }, enabled: { type: "boolean" } },
      required: ["automationId", "enabled"],
    },
  },
  {
    name: "pc_action",
    description: "Open an app, search files, or run a whitelisted shell command on the user's PC",
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["open_app", "search_files", "run_command", "set_volume"] },
        target: { type: "string" },
      },
      required: ["action", "target"],
    },
  },
];

interface ToolCallRecord {
  name: string;
  args: unknown;
  ok: boolean;
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "create_task":
      return Task.create(args);
    case "update_goal":
      return Goal.findByIdAndUpdate(args.goalId, { $inc: { current: args.amount } }, { new: true });
    case "toggle_automation":
      return Automation.findByIdAndUpdate(args.automationId, { enabled: args.enabled }, { new: true });
    case "pc_action":
      return pcAutomation.execute(String(args.action), String(args.target));
    default:
      throw new Error(`unknown tool ${name}`);
  }
}

export async function runAgentPipeline(input: string) {
  // 1. RAG — ground the model with relevant memories.
  const memories = await memoryEngine.search(input, 5);
  const memoryBlock = memories.map((m: { title?: string; content?: string }) => `- ${m.title}: ${m.content}`).join("\n");

  const system = [
    "You are JARVIS, a personal AI operating system. Address the user as 'sir'. Be concise and decisive.",
    "Use tools when the request maps to one; otherwise answer directly.",
    "Relevant long-term memories:",
    memoryBlock || "(none)",
  ].join("\n");

  // 2. Reason + tool-call loop.
  const toolCalls: ToolCallRecord[] = [];
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: input }];

  for (let hop = 0; hop < 4; hop++) {
    const response = await anthropic.messages.create({
      model: "claude-fable-5",
      max_tokens: 1024,
      system,
      tools: TOOLS,
      messages,
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      return { intent: toolCalls[0]?.name ?? "chat", text, toolCalls };
    }

    let result: unknown;
    let ok = true;
    try {
      result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
    } catch (err) {
      ok = false;
      result = { error: String(err) };
    }
    toolCalls.push({ name: toolUse.name, args: toolUse.input, ok });

    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) }],
    });
  }

  return { intent: "multi-step", text: "Plan executed, sir.", toolCalls };
}
