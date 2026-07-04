import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppNotification, ChatMessage, CommandLogEntry, CoreState } from "@/lib/types";
import { seedCommands, seedNotifications, uid } from "@/lib/data/seed";
import { processCommand } from "@/lib/ai/engine";
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
  setCoreState: (s: CoreState) => void;
  setVoiceOutput: (v: boolean) => void;
  setWakeEnabled: (v: boolean) => void;
  setWakeWord: (w: string) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
  submitCommand: (text: string, onNav?: (path: string) => void) => void;
}

const GREETING: ChatMessage = {
  id: "boot",
  role: "jarvis",
  text: "Systems online. Memory engine, task grid, and automation watch are all nominal. How can I help, sir?",
  time: new Date().toISOString(),
};

export const useJarvisStore = create<JarvisState>()(
  persist(
    (set, get) => ({
  coreState: "idle",
  messages: [GREETING],
  streamText: "",
  suggestions: ["morning briefing", "what is due today", "start focus 50"],
  notifications: seedNotifications,
  commandLog: seedCommands,
  voiceOutput: true,
  wakeEnabled: true,
  wakeWord: "shaffa",

  setCoreState: (coreState) => set({ coreState }),
  setVoiceOutput: (voiceOutput) => set({ voiceOutput }),
  setWakeEnabled: (wakeEnabled) => set({ wakeEnabled }),
  setWakeWord: (wakeWord) => set({ wakeWord: wakeWord.toLowerCase().replace(/[^a-z ]/g, "") }),
  markAllRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  submitCommand: (text, onNav) => {
    const input = text.trim();
    if (!input || get().coreState === "processing") return;

    set((s) => ({
      coreState: "processing",
      streamText: "",
      messages: [...s.messages, { id: uid(), role: "user", text: input, time: new Date().toISOString() }],
    }));

    // Reasoning latency, then stream the response token by token.
    setTimeout(() => {
      const result = processCommand(input);
      if (result.nav && onNav) onNav(result.nav);

      set({ coreState: "responding" });

      const words = result.text.split(/(\s+)/);
      let i = 0;
      const tick = setInterval(() => {
        i += 2;
        set({ streamText: words.slice(0, i).join("") });
        if (i >= words.length) {
          clearInterval(tick);
          set((s) => ({
            coreState: "idle",
            streamText: "",
            suggestions: result.suggestions ?? s.suggestions,
            messages: [...s.messages, { id: uid(), role: "jarvis", text: result.text, time: new Date().toISOString() }],
            commandLog: [
              { id: uid(), input, summary: result.text.replace(/\n/g, " ").slice(0, 72) + (result.text.length > 72 ? "…" : ""), time: new Date().toISOString() },
              ...s.commandLog,
            ].slice(0, 20),
          }));
          // Read the full response aloud — SHAFFA is heard, not just seen.
          if (get().voiceOutput) speak(result.text);
        }
      }, 26);
    }, 750 + Math.random() * 550);
  },
    }),
    {
      // Fresh key so the new voice-first defaults apply over old saved settings.
      name: "shaffa-settings",
      partialize: (s) => ({ voiceOutput: s.voiceOutput, wakeEnabled: s.wakeEnabled, wakeWord: s.wakeWord }),
    },
  ),
);
