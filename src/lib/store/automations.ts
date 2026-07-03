import { create } from "zustand";
import type { Automation } from "@/lib/types";
import { seedAutomations, uid } from "@/lib/data/seed";

interface AutomationState {
  automations: Automation[];
  /** id currently mid "run now" simulation */
  runningId: string | null;
  toggle: (id: string) => void;
  runNow: (id: string) => void;
}

export const useAutomationStore = create<AutomationState>((set) => ({
  automations: seedAutomations,
  runningId: null,
  toggle: (id) =>
    set((s) => ({
      automations: s.automations.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    })),
  runNow: (id) => {
    set({ runningId: id });
    setTimeout(() => {
      set((s) => ({
        runningId: null,
        automations: s.automations.map((a) =>
          a.id === id
            ? {
                ...a,
                lastRun: new Date().toISOString(),
                history: [
                  { id: uid(), time: new Date().toISOString(), status: "success" as const, detail: "Manual trigger — completed without incident" },
                  ...a.history,
                ],
              }
            : a,
        ),
      }));
    }, 1600);
  },
}));
