import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Goal } from "@/lib/types";

interface GoalState {
  goals: Goal[];
  addGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;
  increment: (id: string, amount: number) => void;
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set) => ({
      goals: [],
      addGoal: (goal) => set((s) => ({ goals: [goal, ...s.goals] })),
      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      increment: (id, amount) =>
        set((s) => ({
          goals: s.goals.map((g) => {
            if (g.id !== id) return g;
            const current = Math.min(g.target, g.current + amount);
            return {
              ...g,
              current,
              history: [...g.history.slice(-11), current],
              milestones: g.milestones.map((m) => ({ ...m, done: current >= m.at })),
            };
          }),
        })),
    }),
    { name: "shaffa-goals" },
  ),
);

/** Weeks remaining at the goal's observed weekly rate; null when rate is 0. */
export function weeksToComplete(goal: Goal): number | null {
  if (goal.weeklyRate <= 0) return null;
  return Math.max(0, Math.ceil((goal.target - goal.current) / goal.weeklyRate));
}

export function projectedDate(goal: Goal): string | null {
  const weeks = weeksToComplete(goal);
  if (weeks === null) return null;
  return new Date(Date.now() + weeks * 7 * 86_400_000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
