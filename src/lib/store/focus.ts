import { create } from "zustand";

interface FocusState {
  /** epoch ms when the running session ends, null when idle */
  endsAt: number | null;
  minutes: number;
  sessionsToday: number;
  start: (minutes?: number) => void;
  stop: (completed?: boolean) => void;
}

export const useFocusStore = create<FocusState>((set) => ({
  endsAt: null,
  minutes: 50,
  sessionsToday: 2,
  start: (minutes = 50) =>
    set({ minutes, endsAt: Date.now() + minutes * 60_000 }),
  stop: (completed = false) =>
    set((s) => ({ endsAt: null, sessionsToday: s.sessionsToday + (completed ? 1 : 0) })),
}));
