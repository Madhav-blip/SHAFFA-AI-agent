import type { Category, ChatMessage, MemoryType, Priority } from "@/lib/types";
import { useTaskStore } from "@/lib/store/tasks";
import { useMemoryStore } from "@/lib/store/memory";
import { useGoalStore } from "@/lib/store/goals";
import { useAutomationStore } from "@/lib/store/automations";
import { useFocusStore } from "@/lib/store/focus";
import { uid, daysFromNow } from "@/lib/data/seed";

/**
 * Bridge to /api/ai (Claude). The route returns raw Anthropic responses;
 * tool calls are executed here against the zustand stores, then looped
 * back until Claude produces a final text answer.
 */

const SCREEN_PATHS: Record<string, string> = {
  dashboard: "/", memory: "/memory", tasks: "/tasks", goals: "/goals",
  console: "/console", automation: "/automation", analytics: "/analytics",
};

export const NO_KEY_MESSAGE = "No API key added for external commands.";

interface ContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface ApiMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[] | { type: string; tool_use_id: string; content: string }[];
}

/* ------------------------------------------------------------------ */
/* Context snapshot given to Claude on every request                    */
/* ------------------------------------------------------------------ */

function buildContext(): string {
  const tasks = useTaskStore.getState().tasks.filter((t) => t.status !== "done");
  const goals = useGoalStore.getState().goals;
  const memories = useMemoryStore.getState().memories;
  const automations = useAutomationStore.getState().automations;
  const focus = useFocusStore.getState();

  const fmtDue = (iso?: string) =>
    iso ? `due in ${Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000))}d` : "no deadline";

  return [
    `Now: ${new Date().toString()}`,
    `Open tasks (${tasks.length}): ${tasks.map((t) => `"${t.title}" [${t.category}/${t.priority}, ${fmtDue(t.due)}]`).join("; ")}`,
    `Goals: ${goals.map((g) => `${g.title} ${g.current}/${g.target} ${g.unit} (+${g.weeklyRate}/wk, streak ${g.streakDays}d)`).join("; ")}`,
    `Memories: ${memories.map((m) => `[${m.type}] ${m.title}: ${m.content}`).join(" | ")}`,
    `Automations: ${automations.map((a) => `${a.name} (${a.enabled ? "on" : "off"})`).join("; ")}`,
    `Focus session: ${focus.endsAt ? "running" : "idle"}`,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Tool execution against the stores                                    */
/* ------------------------------------------------------------------ */

function executeTool(name: string, input: Record<string, unknown>, onNav?: (path: string) => void): string {
  switch (name) {
    case "create_task": {
      const title = String(input.title ?? "").trim();
      if (!title) return "error: empty title";
      useTaskStore.getState().addTask({
        id: uid(),
        title,
        category: (input.category as Category) ?? "Personal",
        priority: (input.priority as Priority) ?? "medium",
        status: "backlog",
        due: typeof input.due_in_days === "number" ? daysFromNow(input.due_in_days) : undefined,
        createdAt: new Date().toISOString(),
      });
      return `created task "${title}"`;
    }
    case "complete_task": {
      const q = String(input.query ?? "").toLowerCase();
      const store = useTaskStore.getState();
      const hit = store.tasks.find((t) => t.status !== "done" && t.title.toLowerCase().includes(q));
      if (!hit) return `no open task matching "${q}"`;
      store.moveTask(hit.id, "done");
      return `completed "${hit.title}"`;
    }
    case "add_memory": {
      const content = String(input.content ?? "").trim();
      if (!content) return "error: empty content";
      useMemoryStore.getState().addMemory({
        id: uid(),
        type: (input.type as MemoryType) ?? "note",
        title: content.slice(0, 42) + (content.length > 42 ? "…" : ""),
        content,
        tags: ["claude"],
        connections: [],
        strength: 0.6,
        updatedAt: new Date().toISOString(),
      });
      return "memory stored";
    }
    case "start_focus": {
      const minutes = typeof input.minutes === "number" && input.minutes > 0 ? input.minutes : 50;
      useFocusStore.getState().start(minutes);
      return `focus session started for ${minutes} minutes`;
    }
    case "toggle_automation": {
      const q = String(input.name ?? "").toLowerCase();
      const store = useAutomationStore.getState();
      const hit = store.automations.find((a) => a.name.toLowerCase().includes(q));
      if (!hit) return `no automation matching "${q}"`;
      if (hit.enabled !== Boolean(input.enabled)) store.toggle(hit.id);
      return `${hit.name} is now ${input.enabled ? "enabled" : "disabled"}`;
    }
    case "log_goal_progress": {
      const q = String(input.goal_title ?? "").toLowerCase();
      const store = useGoalStore.getState();
      const hit = store.goals.find((g) => g.title.toLowerCase().includes(q));
      if (!hit) return `no goal matching "${q}"`;
      store.increment(hit.id, Number(input.amount) || 1);
      return `logged ${input.amount} on ${hit.title} — now ${hit.current + (Number(input.amount) || 1)}/${hit.target}`;
    }
    case "open_screen": {
      const path = SCREEN_PATHS[String(input.screen ?? "")];
      if (!path) return "unknown screen";
      onNav?.(path);
      return `opened ${input.screen}`;
    }
    default:
      return `unknown tool ${name}`;
  }
}

/* ------------------------------------------------------------------ */
/* Ask Claude — with the client-side tool loop                          */
/* ------------------------------------------------------------------ */

/** Collapse history into strictly alternating user/assistant turns. */
function toApiMessages(history: ChatMessage[], input: string): ApiMessage[] {
  const merged: ApiMessage[] = [];
  for (const m of history.slice(-10)) {
    const role = m.role === "jarvis" ? "assistant" : "user";
    const last = merged[merged.length - 1];
    if (last && last.role === role && typeof last.content === "string") {
      last.content += `\n${m.text}`;
    } else {
      merged.push({ role, content: m.text });
    }
  }
  if (merged[0]?.role === "assistant") merged.shift();
  const last = merged[merged.length - 1];
  if (last && last.role === "user" && typeof last.content === "string") {
    last.content += `\n${input}`;
  } else {
    merged.push({ role: "user", content: input });
  }
  return merged;
}

export async function askClaude(
  input: string,
  history: ChatMessage[],
  onNav?: (path: string) => void,
): Promise<string> {
  const messages = toApiMessages(history, input);

  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, context: buildContext() }),
    });

    if (res.status === 503) return NO_KEY_MESSAGE;
    if (!res.ok) {
      return "Cloud call failed — check the API key and credits.";
    }

    const data: { content: ContentBlock[]; stop_reason: string } = await res.json();
    const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const toolUses = data.content.filter((b) => b.type === "tool_use");

    if (data.stop_reason !== "tool_use" || toolUses.length === 0) {
      return text.trim() || "Done, boss.";
    }

    messages.push({ role: "assistant", content: data.content });
    messages.push({
      role: "user",
      content: toolUses.map((tu) => ({
        type: "tool_result",
        tool_use_id: tu.id ?? "",
        content: executeTool(tu.name ?? "", tu.input ?? {}, onNav),
      })),
    });
  }
  return "Executed, boss — the full plan ran to completion.";
}
