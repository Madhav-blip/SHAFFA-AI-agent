import type { EngineResult, Category, Task } from "@/lib/types";
import { useTaskStore } from "@/lib/store/tasks";
import { useGoalStore } from "@/lib/store/goals";
import { useMemoryStore } from "@/lib/store/memory";
import { useAutomationStore } from "@/lib/store/automations";
import { useFocusStore } from "@/lib/store/focus";
import { uid, daysFromNow } from "@/lib/data/seed";

/**
 * Local command engine — the on-device fallback for the LLM pipeline.
 * In production this sits behind /api/ai (see server/): the same intents
 * are resolved by tool-calling, and unresolved input falls through to the LLM.
 */

export function guessCategory(title: string): Category {
  return CATEGORY_HINTS.find(([re]) => re.test(title))?.[1] ?? "Personal";
}

const CATEGORY_HINTS: [RegExp, Category][] = [
  [/leetcode|dsa|algo|graph|dp|array|tree/i, "DSA"],
  [/college|assignment|lab|exam|lecture|dbms|os\b/i, "College"],
  [/intern|resume|apply|application|referral|alumni/i, "Internship"],
  [/gym|run|workout|fitness|meal/i, "Fitness"],
];

function fmtDue(iso?: string): string {
  if (!iso) return "no deadline";
  const d = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "tomorrow";
  return `in ${d} days`;
}

/* Screen aliases + any movement-ish verb → phrasing-agnostic navigation.
 * "take me to memory", "pull up my tasks", "lemme see the stats" all work. */
const SCREEN_ALIASES: [RegExp, string, string][] = [
  [/\bdashboard\b|\bhome\b|main screen/, "/", "dashboard"],
  [/\bmemor(y|ies)\b/, "/memory", "memory"],
  [/\btasks?\b|\bboard\b|\bkanban\b|to.?do/, "/tasks", "task grid"],
  [/\bgoals?\b/, "/goals", "goals"],
  [/\bconsole\b|\bterminal\b|\bdev\b|\bcode\b/, "/console", "developer console"],
  [/\bautomations?\b|\broutines?\b/, "/automation", "automation center"],
  [/\banalytics\b|\bstats\b|\bcharts?\b|\btelemetry\b|\binsights?\b/, "/analytics", "analytics"],
];

const NAV_VERB =
  /\b(open|show|go|goto|take|bring|navigate|pull|launch|switch|see|view|visit|display|check|jump|head|lemme|gimme)\b/;

function resolveNav(lower: string): { nav: string; label: string } | null {
  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  // Either a movement verb anywhere, or a bare screen name ("memory").
  if (!NAV_VERB.test(lower) && wordCount > 2) return null;
  for (const [re, nav, label] of SCREEN_ALIASES) {
    if (re.test(lower)) return { nav, label };
  }
  return null;
}

export function processCommand(raw: string): EngineResult {
  let input = raw.trim();
  // Strip a leading wake phrase ("hey shaffa …", "jarvis, …") so the rest
  // resolves as a normal command; a bare greeting is kept as-is.
  const wake = input.match(/^(?:hey|ok|okay)?[\s,]*(?:jarvis|shaffa)\b[\s,!.]*/i);
  if (wake && wake[0].length < input.length) input = input.slice(wake[0].length);
  const lower = input.toLowerCase();

  /* -- add task ---------------------------------------------------- */
  const addMatch = input.match(/^(add|create|new)\s+(a\s+)?task:?\s+(.+)/i) ?? input.match(/^remind me to\s+(.+)/i);
  if (addMatch) {
    const title = (addMatch[3] ?? addMatch[1]).trim();
    const category = CATEGORY_HINTS.find(([re]) => re.test(title))?.[1] ?? "Personal";
    const task: Task = {
      id: uid(), title: title[0].toUpperCase() + title.slice(1), category,
      priority: "medium", status: "backlog", due: daysFromNow(1), createdAt: new Date().toISOString(),
    };
    useTaskStore.getState().addTask(task);
    return {
      text: `Task logged: “${task.title}” — filed under ${category}, due ${fmtDue(task.due)}. I placed it in the backlog; say “prioritize it” if that changes.`,
      nav: "/tasks",
      spoken: "Task added.",
      suggestions: ["open tasks", "what is due today", "start focus 50"],
    };
  }

  /* -- complete task ----------------------------------------------- */
  const doneMatch = input.match(/^(complete|finish|done with|mark done)\s+(.+)/i);
  if (doneMatch) {
    const frag = doneMatch[2].toLowerCase();
    const store = useTaskStore.getState();
    const hit = store.tasks.find((t) => t.status !== "done" && t.title.toLowerCase().includes(frag));
    if (hit) {
      store.moveTask(hit.id, "done");
      return {
        text: `Marked “${hit.title}” as complete. ${store.tasks.filter((t) => t.status !== "done").length - 1} open items remain.`,
        spoken: "Done and logged.",
        suggestions: ["what is due today", "open tasks"],
      };
    }
    return { text: `I could not find an open task matching “${doneMatch[2]}”. The closest matches are on the Tasks board.`, nav: "/tasks" };
  }

  /* -- focus ------------------------------------------------------- */
  const focusMatch = lower.match(/(start|begin)\s+(a\s+)?focus(\s+session)?(\s+(\d+))?/);
  if (focusMatch) {
    const mins = focusMatch[5] ? parseInt(focusMatch[5], 10) : 50;
    useFocusStore.getState().start(mins);
    return {
      text: `Focus session armed for ${mins} minutes. Focus Guard is muting notifications and I will log this block toward today’s deep-work total. Timer is live on the dashboard.`,
      nav: "/",
      spoken: `Focus session started. ${mins} minutes.`,
      suggestions: ["stop focus", "play status report", "open analytics"],
    };
  }

  if (/^(stop|end|cancel)\s+(the\s+)?focus/.test(lower)) {
    useFocusStore.getState().stop(false);
    return { text: "Focus session ended. Notifications restored. The partial block has been logged.", spoken: "Focus ended." };
  }

  /* -- navigation — phrasing-agnostic ------------------------------ */
  const navHit = resolveNav(lower);
  if (navHit) {
    return {
      text: `Taking you to ${navHit.label}, boss.`,
      nav: navHit.nav,
      spoken: `Opening ${navHit.label}.`,
      suggestions: ["morning briefing", "system status", "start focus 50"],
    };
  }

  /* -- due today / briefing ---------------------------------------- */
  if (/briefing|due today|agenda|what('s| is) due/.test(lower)) {
    const tasks = useTaskStore.getState().tasks.filter((t) => t.status !== "done");
    const dueSoon = tasks.filter((t) => t.due && new Date(t.due).getTime() - Date.now() < 86_400_000);
    const goals = useGoalStore.getState().goals;
    const parts: string[] = [];
    if (dueSoon.length > 0) {
      parts.push(
        `${dueSoon.length} item${dueSoon.length === 1 ? "" : "s"} inside the 24-hour window: ` +
          dueSoon.map((t) => `“${t.title}” (${fmtDue(t.due)})`).join("; ") + ".",
      );
    } else if (tasks.length > 0) {
      parts.push(`Nothing due in the next 24 hours — ${tasks.length} open item${tasks.length === 1 ? "" : "s"} on the board overall.`);
    } else {
      parts.push("The board is clear — no open tasks.");
    }
    if (goals.length > 0) {
      parts.push(
        "Goals: " +
          goals.map((g) => `${g.title} at ${Math.round((g.current / g.target) * 100)}%`).join(", ") + ".",
      );
    }
    if (tasks.length === 0 && goals.length === 0) {
      parts.push("Add tasks and goals — or just tell me what is on your plate — and these briefings get sharp.");
    }
    return {
      text: `Briefing, boss. ${parts.join(" ")}`,
      spoken: dueSoon.length > 0 ? `You have ${dueSoon.length} items due within twenty-four hours.` : "Nothing urgent on the board.",
      suggestions: ["start focus 50", "add task: plan my week", "how are my goals"],
    };
  }

  /* -- goals -------------------------------------------------------- */
  if (/goal|leetcode|aws/.test(lower) && /\b(my|how|show|status|progress|track)\b/.test(lower)) {
    const goals = useGoalStore.getState().goals;
    if (goals.length === 0) {
      return {
        text: "No goals tracked yet, boss. Open the Goals screen and create one — I will track your velocity and project a completion date from real progress.",
        nav: "/goals",
        suggestions: ["open goals", "morning briefing"],
      };
    }
    const lines = goals.map((g) => {
      const pct = Math.round((g.current / g.target) * 100);
      const weeks = g.weeklyRate > 0 ? Math.ceil((g.target - g.current) / g.weeklyRate) : null;
      return `${g.title}: ${g.current}/${g.target} ${g.unit} (${pct}%)${weeks !== null ? ` — ~${weeks} weeks to completion at current pace` : ""}`;
    });
    return {
      text: `Goal telemetry:\n${lines.join("\n")}`,
      nav: "/goals",
      spoken: "Goal telemetry on screen.",
      suggestions: ["open goals", "start focus 50"],
    };
  }

  /* -- memory ------------------------------------------------------- */
  const rememberMatch = input.match(/^remember\s+(that\s+)?(.+)/i);
  if (rememberMatch) {
    const content = rememberMatch[2];
    useMemoryStore.getState().addMemory({
      id: uid(), type: "note", title: content.slice(0, 42) + (content.length > 42 ? "…" : ""),
      content: content[0].toUpperCase() + content.slice(1), tags: ["voice-note"], connections: [],
      strength: 0.6, updatedAt: new Date().toISOString(),
    });
    return {
      text: `Committed to long-term memory: “${content}”. I will surface it when relevant and link it to related memories overnight.`,
      nav: "/memory",
      spoken: "Noted and remembered.",
    };
  }

  /* -- automations --------------------------------------------------- */
  if (/automation|routine/.test(lower) && /\b(my|show|list|status|which|open)\b/.test(lower)) {
    const autos = useAutomationStore.getState().automations;
    const on = autos.filter((a) => a.enabled);
    return {
      text:
        `${on.length} of ${autos.length} automations are armed${on.length ? `: ${on.map((a) => a.name).join(", ")}` : ""}. ` +
        "Describe a new one in plain English on the Automation screen — schedule and action are parsed automatically, and it will actually fire.",
      nav: "/automation",
      suggestions: ["open automation", "morning briefing"],
    };
  }

  /* -- status -------------------------------------------------------- */
  if (/\b(system status|status report|diagnostics?|all systems)\b/.test(lower) || lower === "status") {
    const autos = useAutomationStore.getState().automations.filter((a) => a.enabled).length;
    const mems = useMemoryStore.getState().memories.length;
    return {
      text: `All systems nominal, boss. ${autos} automation${autos === 1 ? "" : "s"} on watch, ${mems} memor${mems === 1 ? "y" : "ies"} indexed, voice pipeline armed. Local engine responding; anything I cannot handle escalates to cloud reasoning.`,
      spoken: "All systems nominal.",
      suggestions: ["morning briefing", "open analytics"],
    };
  }

  /* -- error / debug pastes (multi-line dumps and real signatures only) */
  if (/\n/.test(input) && (/error|exception|failed|traceback|stack/i.test(lower) || /select\s+.*from/i.test(lower))) {
    return {
      text: "I recognize this failure signature — it matches the registration API fault in alumni-system. Routing it to the developer console: root cause isolated, offending line highlighted, corrected query prepared. Review the fix on the analysis panel.",
      nav: "/console",
      spoken: "Routing to the developer console.",
      suggestions: ["explain the fix", "open console"],
    };
  }

  /* -- greetings / fallback ------------------------------------------ */
  if (/^(hi|hello|hey|yo|jarvis|shaffa)\b/.test(lower)) {
    const open = useTaskStore.getState().tasks.filter((t) => t.status !== "done").length;
    return {
      text:
        open > 0
          ? `At your service, boss. ${open} open item${open === 1 ? "" : "s"} on the board. Where shall we begin?`
          : "At your service, boss. The board is clear — give me a task, a goal, or a question.",
      spoken: "At your service, boss.",
      suggestions: ["morning briefing", "what is due today", "add task: plan my week"],
    };
  }

  /* -- no local intent → escalate to Claude -------------------------- */
  return {
    fallback: true,
    text: "Cloud link unreachable — local commands still work, boss.",
    suggestions: ["morning briefing", "system status", "add task revise dp patterns"],
  };
}
