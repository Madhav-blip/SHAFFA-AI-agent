import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FocusSession {
  day: string; // "YYYY-MM-DD"
  minutes: number;
}

interface FocusState {
  /** epoch ms when the running session ends, null when idle */
  endsAt: number | null;
  minutes: number;
  /** completed sessions — real telemetry for analytics */
  sessions: FocusSession[];
  start: (minutes?: number) => void;
  stop: (completed?: boolean) => void;
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set) => ({
      endsAt: null,
      minutes: 50,
      sessions: [],
      start: (minutes = 50) => set({ minutes, endsAt: Date.now() + minutes * 60_000 }),
      stop: (completed = false) =>
        set((s) => ({
          endsAt: null,
          sessions: completed
            ? [...s.sessions, { day: new Date().toISOString().slice(0, 10), minutes: s.minutes }].slice(-500)
            : s.sessions,
        })),
    }),
    { name: "shaffa-focus" },
  ),
);

export const todayKey = (): string => new Date().toISOString().slice(0, 10);

export function sessionsOn(sessions: FocusSession[], day: string): FocusSession[] {
  return sessions.filter((s) => s.day === day);
}
