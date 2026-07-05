import { useAutomationStore } from "@/lib/store/automations";
import { useTaskStore } from "@/lib/store/tasks";
import { useFocusStore } from "@/lib/store/focus";
import { useJarvisStore } from "@/lib/store/jarvis";
import { speak } from "@/lib/voice";
import type { Automation } from "@/lib/types";

/**
 * The automation engine. AppShell calls tick() every 30 seconds; enabled
 * automations whose rule matches fire their action for real:
 *   remind  → notification + spoken aloud
 *   command → routed through submitCommand (local intents or Claude)
 *   focus   → starts a focus session
 */

function shouldFire(a: Automation, now: Date, today: string, hhmm: string): boolean {
  if (!a.enabled || !a.rule || !a.action) return false;
  switch (a.rule.kind) {
    case "daily":
      return a.rule.time === hhmm && a.lastFiredDay !== today;
    case "interval":
      return now.getTime() - (a.lastFiredAt ?? 0) >= a.rule.minutes * 60_000;
    case "deadline": {
      const horizon = (a.rule.withinHours ?? 24) * 3_600_000;
      const soon = useTaskStore.getState().tasks.filter((t) => {
        if (t.status === "done" || !t.due) return false;
        const delta = new Date(t.due).getTime() - now.getTime();
        return delta > 0 && delta < horizon;
      });
      // re-alert at most every 6 hours
      return soon.length > 0 && now.getTime() - (a.lastFiredAt ?? 0) >= 6 * 3_600_000;
    }
  }
}

function execute(a: Automation): string {
  const jarvis = useJarvisStore.getState();
  const action = a.action!;
  switch (action.kind) {
    case "remind": {
      jarvis.addNotification({
        id: Math.random().toString(36).slice(2, 10),
        title: a.name,
        detail: action.payload,
        time: new Date().toISOString(),
        kind: "alert",
        read: false,
      });
      if (jarvis.voiceOutput) speak(`Boss — ${action.payload}`);
      return `reminded: ${action.payload}`;
    }
    case "focus": {
      const minutes = parseInt(action.payload, 10) || 50;
      useFocusStore.getState().start(minutes);
      return `started a ${minutes}-minute focus session`;
    }
    case "command": {
      jarvis.submitCommand(action.payload);
      return `ran command: "${action.payload}"`;
    }
  }
}

/** Manual "run now" — executes the action immediately and logs it. */
export function executeNow(a: Automation): void {
  const { markFired } = useAutomationStore.getState();
  if (!a.action) {
    markFired(a.id, { status: "skipped", detail: "no action configured — edit the instruction" });
    return;
  }
  try {
    const detail = execute(a);
    markFired(a.id, { status: "success", detail: `manual run — ${detail}` });
  } catch (err) {
    markFired(a.id, { status: "failed", detail: String(err).slice(0, 120) });
  }
}

export function tickAutomations(): void {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const { automations, markFired } = useAutomationStore.getState();

  for (const a of automations) {
    if (!shouldFire(a, now, today, hhmm)) continue;
    let detail: string;
    try {
      detail = execute(a);
      markFired(a.id, { status: "success", detail });
    } catch (err) {
      markFired(a.id, { status: "failed", detail: String(err).slice(0, 120) });
    }
  }
}
