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

const NAV_TARGETS: Record<string, string> = {
  dashboard: "/", home: "/", memory: "/memory", tasks: "/tasks", task: "/tasks",
  goals: "/goals", goal: "/goals", console: "/console", developer: "/console",
  automation: "/automation", automations: "/automation", analytics: "/analytics",
};

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

export function processCommand(raw: string): EngineResult {
  let input = raw.trim();
  // Strip a leading wake phrase ("hey shaffa …", "jarvis, …") so the rest
  // resolves as a normal command; a bare greeting is kept as-is.
  const wake = input.match(/^(?:hey|ok|okay)?[\s,]*(?:jarvis|shaffa)\b[\s,!.]*/i);
  if (wake && wake[0].length < input.length) input = input.slice(wake[0].length);
  const lower = input.toLowerCase();

  /* -- navigation ------------------------------------------------- */
  const navMatch = lower.match(/^(open|show|go to|goto|switch to)\s+(the\s+)?(\w+)/);
  if (navMatch && NAV_TARGETS[navMatch[3]] !== undefined) {
    const target = navMatch[3];
    return {
      text: `Bringing up the ${target === "console" || target === "developer" ? "developer console" : target} view now, sir.`,
      nav: NAV_TARGETS[target],
      spoken: `Opening ${target}.`,
      suggestions: ["morning briefing", "system status", "start focus 50"],
    };
  }

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

  /* -- due today / briefing ---------------------------------------- */
  if (/briefing|due today|what.*today|agenda/.test(lower)) {
    const tasks = useTaskStore.getState().tasks.filter((t) => t.status !== "done");
    const dueSoon = tasks.filter((t) => t.due && new Date(t.due).getTime() - Date.now() < 86_400_000);
    const goals = useGoalStore.getState().goals;
    const lc = goals.find((g) => g.id === "g1");
    return {
      text:
        `Briefing, sir. ${dueSoon.length} item${dueSoon.length === 1 ? "" : "s"} inside the 24-hour window: ` +
        dueSoon.map((t) => `“${t.title}” (${fmtDue(t.due)})`).join("; ") +
        `. LeetCode stands at ${lc?.current}/${lc?.target} with the streak broken for 4 days — tonight is the recovery window. ` +
        `The Alumni System demo remains the highest-leverage deadline. Recommend: DSA block at 21:00, API fix before that.`,
      spoken: `You have ${dueSoon.length} items due within twenty-four hours.`,
      suggestions: ["start focus 50", "open console", "how are my goals"],
    };
  }

  /* -- goals -------------------------------------------------------- */
  if (/goal|leetcode|aws|progress/.test(lower)) {
    const goals = useGoalStore.getState().goals;
    const lines = goals.map((g) => {
      const pct = Math.round((g.current / g.target) * 100);
      const weeks = g.weeklyRate > 0 ? Math.ceil((g.target - g.current) / g.weeklyRate) : Infinity;
      return `${g.title}: ${g.current}/${g.target} ${g.unit} (${pct}%) — projected completion in ~${weeks} weeks at current pace`;
    });
    return {
      text: `Goal telemetry:\n${lines.join("\n")}\nThe LeetCode trajectory slipped 12% this week. Restoring the nightly drill closes the gap by mid-August.`,
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
  if (/automation|routine/.test(lower)) {
    const autos = useAutomationStore.getState().automations;
    const on = autos.filter((a) => a.enabled).length;
    return {
      text: `${on} of ${autos.length} automations are live: ${autos.filter((a) => a.enabled).map((a) => a.name).join(", ")}. The Project File Watcher is paused — it flagged 2 failing tests on its last run. Want me to re-enable it?`,
      nav: "/automation",
      suggestions: ["enable file watcher", "open automation"],
    };
  }
  if (/enable file watcher/.test(lower)) {
    const store = useAutomationStore.getState();
    const fw = store.automations.find((a) => a.id === "a4");
    if (fw && !fw.enabled) store.toggle("a4");
    return { text: "Project File Watcher re-engaged. I will run lint and the test suite on every save in ~/dev/alumni-system and report regressions to the console.", nav: "/automation", spoken: "File watcher enabled." };
  }

  /* -- status -------------------------------------------------------- */
  if (/status|diagnostic|system/.test(lower)) {
    return {
      text: "All systems nominal. Core temperature stable, memory engine at 97% retrieval confidence, 5 automations on watch. Local model latency 41 ms; cloud reasoning link healthy. No anomalies in the last 24 hours.",
      spoken: "All systems nominal.",
      suggestions: ["morning briefing", "open analytics"],
    };
  }

  /* -- error / debug pastes ------------------------------------------ */
  if (/error|exception|failed|traceback|stack/i.test(lower) || /select\s+.*from/i.test(lower)) {
    return {
      text: "I recognize this failure signature — it matches the registration API fault in alumni-system. Routing it to the developer console: root cause isolated, offending line highlighted, corrected query prepared. Review the fix on the analysis panel.",
      nav: "/console",
      spoken: "Routing to the developer console.",
      suggestions: ["explain the fix", "open console"],
    };
  }

  /* -- greetings / fallback ------------------------------------------ */
  if (/^(hi|hello|hey|yo|jarvis|shaffa)\b/.test(lower)) {
    return {
      text: "At your service, sir. Four items sit inside the 24-hour window and your DSA streak needs attention tonight. Where shall we begin?",
      spoken: "At your service.",
      suggestions: ["morning briefing", "what is due today", "open console"],
    };
  }

  return {
    text: `Understood — parsing “${input}”. I do not have a local tool bound to that phrase yet, so in production I would escalate it to the cloud reasoning model with your memory context attached. Meanwhile: try “add task …”, “start focus 50”, “morning briefing”, or paste an error for analysis.`,
    suggestions: ["morning briefing", "system status", "add task revise dp patterns"],
  };
}
