import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppNotification, ChatMessage, CommandLogEntry, CoreState } from "@/lib/types";
import { uid } from "@/lib/data/seed";
import { processCommand } from "@/lib/ai/engine";
import { askClaude } from "@/lib/ai/cloud";
import { speak } from "@/lib/voice";

interface JarvisState {
  coreState: CoreState;
  messages: ChatMessage[];
  /** text currently being streamed into the response panel */
  streamText: string;
  suggestions: string[];
  notifications: AppNotification[];
  commandLog: CommandLogEntry[];
  voiceOutput: boolean;
  /** hands-free wake word mode ("Hey Shaffa …") */
  wakeEnabled: boolean;
  wakeWord: string;
  /** epoch ms of the last interaction — drives welcome-back vs quick greetings */
  lastInteractionAt: number;
  touch: () => void;
  setCoreState: (s: CoreState) => void;
  setVoiceOutput: (v: boolean) => void;
  setWakeEnabled: (v: boolean) => void;
  setWakeWord: (w: string) => void;
  markAllRead: () => void;
  addNotification: (n: AppNotification) => void;
  dismissNotification: (id: string) => void;
  submitCommand: (text: string, onNav?: (path: string) => void) => void;
}

const GREETING: ChatMessage = {
  id: "boot",
  role: "jarvis",
  text: "Systems online, boss. Memory engine, task grid, and automation watch are all nominal. What are we doing today?",
  time: new Date().toISOString(),
};

export const useJarvisStore = create<JarvisState>()(
  persist(
    (set, get) => ({
  coreState: "idle",
  messages: [GREETING],
  streamText: "",
  suggestions: ["morning briefing", "add task: plan my week", "start focus 50"],
  notifications: [],
  commandLog: [],
  voiceOutput: true,
  wakeEnabled: true,
  wakeWord: "shaffa",
  lastInteractionAt: 0,

  touch: () => set({ lastInteractionAt: Date.now() }),
  setCoreState: (coreState) => set({ coreState }),
  setVoiceOutput: (voiceOutput) => set({ voiceOutput }),
  setWakeEnabled: (wakeEnabled) => set({ wakeEnabled }),
  setWakeWord: (wakeWord) => set({ wakeWord: wakeWord.toLowerCase().replace(/[^a-z ]/g, "") }),
  markAllRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  addNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications].slice(0, 30) })),
  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  submitCommand: (text, onNav) => {
    const input = text.trim();
    if (!input || get().coreState === "processing") return;

    set((s) => ({
      coreState: "processing",
      streamText: "",
      lastInteractionAt: Date.now(),
      messages: [...s.messages, { id: uid(), role: "user", text: input, time: new Date().toISOString() }],
    }));

    const streamOut = (text: string, suggestions?: string[]) => {
      set({ coreState: "responding" });
      // Speak immediately — the voice should never wait for the text animation.
      if (get().voiceOutput) speak(text);
      const words = text.split(/(\s+)/);
      let i = 0;
      const tick = setInterval(() => {
        i += 4;
        set({ streamText: words.slice(0, i).join("") });
        if (i >= words.length) {
          clearInterval(tick);
          set((s) => ({
            coreState: "idle",
            streamText: "",
            suggestions: suggestions ?? s.suggestions,
            messages: [...s.messages, { id: uid(), role: "jarvis", text, time: new Date().toISOString() }],
            commandLog: [
              { id: uid(), input, summary: text.replace(/\n/g, " ").slice(0, 72) + (text.length > 72 ? "…" : ""), time: new Date().toISOString() },
              ...s.commandLog,
            ].slice(0, 20),
          }));
        }
      }, 16);
    };

    // Local intent match first; anything unmatched escalates to Claude.
    // Minimal think-delay — responsiveness beats theatre.
    setTimeout(() => {
      const result = processCommand(input);
      if (result.nav && onNav) onNav(result.nav);

      if (result.fallback) {
        // history excludes the user message pushed above — askClaude appends it
        askClaude(input, get().messages.slice(0, -1), onNav)
          .then((answer) => streamOut(answer, ["morning briefing", "what is due today"]))
          .catch(() => streamOut(result.text, result.suggestions));
        return;
      }
      streamOut(result.text, result.suggestions);
    }, 120);
  },
    }),
    {
      // Fresh key so the new voice-first defaults apply over old saved settings.
      name: "shaffa-settings",
      partialize: (s) => ({ voiceOutput: s.voiceOutput, wakeEnabled: s.wakeEnabled, wakeWord: s.wakeWord, lastInteractionAt: s.lastInteractionAt }),
    },
  ),
);
