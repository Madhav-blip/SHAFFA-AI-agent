import { create } from "zustand";
import type { Goal } from "@/lib/types";
import { seedGoals } from "@/lib/data/seed";

interface GoalState {
  goals: Goal[];
  increment: (id: string, amount: number) => void;
}

export const useGoalStore = create<GoalState>((set) => ({
  goals: seedGoals,
  increment: (id, amount) =>
    set((s) => ({
      goals: s.goals.map((g) => {
        if (g.id !== id) return g;
        const current = Math.min(g.target, g.current + amount);
        return {
          ...g,
          current,
          milestones: g.milestones.map((m) => ({ ...m, done: current >= m.at })),
        };
      }),
    })),
}));

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
