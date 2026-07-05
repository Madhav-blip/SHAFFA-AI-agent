import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Automation, AutomationRun } from "@/lib/types";
import { uid } from "@/lib/data/seed";
import { parseAutomation } from "@/lib/automation/parse";

/** Functional defaults — these actually fire via the runner. */
const DEFAULT_AUTOMATIONS: Automation[] = [
  {
    id: "auto-briefing",
    name: "Morning Briefing",
    icon: "sunrise",
    trigger: "every morning at 7:30 give me my briefing",
    schedule: "Daily · 07:30",
    enabled: true,
    lastRun: new Date().toISOString(),
    successRate: 1,
    history: [],
    rule: { kind: "daily", time: "07:30" },
    action: { kind: "command", payload: "morning briefing" },
  },
  {
    id: "auto-deadline",
    name: "Deadline Sentinel",
    icon: "siren",
    trigger: "alert me when any task deadline is within 24 hours",
    schedule: "Deadline < 24h",
    enabled: true,
    lastRun: new Date().toISOString(),
    successRate: 1,
    history: [],
    rule: { kind: "deadline", withinHours: 24 },
    action: { kind: "remind", payload: "a task deadline is inside the 24-hour window. Check the board." },
  },
  {
    id: "auto-dsa",
    name: "Night Focus Nudge",
    icon: "brain",
    trigger: "every night at 9pm remind me to start deep work",
    schedule: "Daily · 21:00",
    enabled: true,
    lastRun: new Date().toISOString(),
    successRate: 1,
    history: [],
    rule: { kind: "daily", time: "21:00" },
    action: { kind: "remind", payload: "your peak focus window just opened. Time for deep work." },
  },
];

interface AutomationState {
  automations: Automation[];
  /** id currently mid "run now" simulation */
  runningId: string | null;
  toggle: (id: string) => void;
  update: (id: string, patch: Partial<Pick<Automation, "name" | "trigger" | "schedule">>) => void;
  /** create a real automation from a natural-language instruction */
  addFromText: (text: string) => Automation;
  remove: (id: string) => void;
  markFired: (id: string, run: Pick<AutomationRun, "status" | "detail">) => void;
  runNow: (id: string) => void;
}

export const useAutomationStore = create<AutomationState>()(
  persist(
    (set, get) => ({
      automations: DEFAULT_AUTOMATIONS,
      runningId: null,
      toggle: (id) =>
        set((s) => ({
          automations: s.automations.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
        })),
      update: (id, patch) =>
        set((s) => ({
          automations: s.automations.map((a) => {
            if (a.id !== id) return a;
            // trigger text changed → re-parse rule + action from it
            if (patch.trigger && patch.trigger !== a.trigger) {
              const parsed = parseAutomation(patch.trigger);
              return {
                ...a,
                ...patch,
                name: patch.name?.trim() || parsed.name,
                schedule: parsed.schedule,
                rule: parsed.rule,
                action: parsed.action,
              };
            }
            return { ...a, ...patch };
          }),
        })),
      addFromText: (text) => {
        const automation = parseAutomation(text);
        set((s) => ({ automations: [automation, ...s.automations] }));
        return automation;
      },
      remove: (id) => set((s) => ({ automations: s.automations.filter((a) => a.id !== id) })),
      markFired: (id, run) =>
        set((s) => ({
          automations: s.automations.map((a) =>
            a.id === id
              ? {
                  ...a,
                  lastRun: new Date().toISOString(),
                  lastFiredAt: Date.now(),
                  lastFiredDay: new Date().toISOString().slice(0, 10),
                  history: [
                    { id: uid(), time: new Date().toISOString(), ...run },
                    ...a.history,
                  ].slice(0, 30),
                }
              : a,
          ),
        })),
      runNow: (id) => {
        set({ runningId: id });
        // brief spin, then execute for real via the runner's executor
        setTimeout(async () => {
          const { executeNow } = await import("@/lib/automation/runner");
          const automation = get().automations.find((a) => a.id === id);
          if (automation) executeNow(automation);
          set({ runningId: null });
        }, 900);
      },
    }),
    { name: "shaffa-automations", partialize: (s) => ({ automations: s.automations }) },
  ),
);
