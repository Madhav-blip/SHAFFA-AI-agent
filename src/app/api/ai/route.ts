import { NextResponse } from "next/server";

/**
 * Cloud reasoning endpoint — escalates anything the local intent engine
 * cannot handle to Claude, with tools that let Claude drive SHAFFA itself.
 * Tool calls are executed client-side (state lives in zustand) and looped
 * back here with results until Claude produces a final answer.
 *
 * Requires ANTHROPIC_API_KEY in .env.local. Optional: SHAFFA_MODEL.
 */

const MODEL = process.env.SHAFFA_MODEL ?? "claude-sonnet-5";

const TOOLS = [
  {
    name: "create_task",
    description: "Create a task on the user's board",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        category: { type: "string", enum: ["College", "DSA", "Internship", "Personal", "Fitness"] },
        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
        due_in_days: { type: "number", description: "days from now; omit for no deadline" },
      },
      required: ["title"],
    },
  },
  {
    name: "complete_task",
    description: "Mark the open task best matching the query as done",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "add_memory",
    description: "Store a fact in long-term memory",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string" },
        type: { type: "string", enum: ["goal", "preference", "project", "deadline", "note"] },
      },
      required: ["content"],
    },
  },
  {
    name: "start_focus",
    description: "Start a focus session (default 50 minutes)",
    input_schema: { type: "object", properties: { minutes: { type: "number" } } },
  },
  {
    name: "toggle_automation",
    description: "Enable or disable an automation by (partial) name",
    input_schema: {
      type: "object",
      properties: { name: { type: "string" }, enabled: { type: "boolean" } },
      required: ["name", "enabled"],
    },
  },
  {
    name: "log_goal_progress",
    description: "Add progress to a goal by (partial) title",
    input_schema: {
      type: "object",
      properties: { goal_title: { type: "string" }, amount: { type: "number" } },
      required: ["goal_title", "amount"],
    },
  },
  {
    name: "open_screen",
    description: "Navigate the UI to a screen",
    input_schema: {
      type: "object",
      properties: {
        screen: { type: "string", enum: ["dashboard", "memory", "tasks", "goals", "console", "automation", "analytics"] },
      },
      required: ["screen"],
    },
  },
];

function systemPrompt(context: string): string {
  return [
    "You are S.H.A.F.F.A — Madhav's personal AI operating system. Address him as \"boss\".",
    "Be warm, decisive, and concise: 1–5 sentences for most answers, more only when he asks for depth.",
    "Your replies are read aloud by TTS, so write speakable prose. No markdown headers, tables, or bullet lists unless he asks for code or a list. Code is the exception: format it normally.",
    "Use the tools when a request maps to an app action; otherwise just answer. Never invent tool results.",
    "You do not yet have access to his email, calendar, or drive — if asked, say that integration is pending and offer what you can do instead.",
    "",
    "Live context from the app:",
    context,
  ].join("\n");
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "no_key" }, { status: 503 });
  }

  let body: { messages?: unknown[]; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: systemPrompt(String(body.context ?? "")),
      tools: TOOLS,
      messages: body.messages,
    }),
  });

  if (!upstream.ok) {
    const detail = (await upstream.text()).slice(0, 400);
    return NextResponse.json({ error: "upstream", status: upstream.status, detail }, { status: 502 });
  }
  return NextResponse.json(await upstream.json());
}
