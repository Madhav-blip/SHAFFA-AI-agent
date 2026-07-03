"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CircleDot, MessageSquareText, Sparkles } from "lucide-react";
import AICore from "@/components/core/AICore";
import { useJarvisStore } from "@/lib/store/jarvis";
import { useTaskStore } from "@/lib/store/tasks";
import { useFocusStore } from "@/lib/store/focus";
import { dueLabel, PRIORITY_COLOR } from "@/components/ui/primitives";
import type { CoreState } from "@/lib/types";

const STATE_LINE: Record<CoreState, string> = {
  idle: "Standing by — all channels open",
  listening: "Audio channel open · capturing input",
  processing: "Reasoning over context + memory",
  responding: "Streaming response",
};

export default function RightPanel() {
  const router = useRouter();
  const coreState = useJarvisStore((s) => s.coreState);
  const messages = useJarvisStore((s) => s.messages);
  const streamText = useJarvisStore((s) => s.streamText);
  const suggestions = useJarvisStore((s) => s.suggestions);
  const submitCommand = useJarvisStore((s) => s.submitCommand);
  const tasks = useTaskStore((s) => s.tasks);
  const focusEndsAt = useFocusStore((s) => s.endsAt);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streamText]);

  const activeTasks = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))
    .slice(0, 3);

  return (
    <aside className="z-30 hidden w-80 shrink-0 flex-col border-l border-line/70 bg-abyss/60 backdrop-blur-xl xl:flex">
      {/* Mini core */}
      <div className="flex flex-col items-center border-b border-line/60 py-4">
        <AICore state={coreState} size={92} />
        <div className="hud-label mt-2 !text-cyan-200/60">{STATE_LINE[coreState]}</div>
      </div>

      {/* Conversation */}
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-cyan-300/70">
          <MessageSquareText size={13} />
          <span className="hud-label !text-cyan-200/70">AI Channel</span>
        </div>
        <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {messages.slice(-8).map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[92%] rounded-xl border px-3 py-2 text-[13.5px] leading-relaxed whitespace-pre-line ${
                m.role === "user"
                  ? "self-end border-line bg-raised/80 text-icy"
                  : "self-start border-cyan-400/25 bg-cyan-400/[0.06] text-cyan-50/90"
              }`}
            >
              {m.text}
            </motion.div>
          ))}
          {streamText && (
            <div className="max-w-[92%] self-start rounded-xl border border-cyan-400/25 bg-cyan-400/[0.06] px-3 py-2 text-[13.5px] leading-relaxed whitespace-pre-line text-cyan-50/90">
              {streamText}
              <span className="animate-blink ml-0.5 inline-block h-3.5 w-[7px] translate-y-0.5 bg-cyan-300" />
            </div>
          )}
          {coreState === "processing" && !streamText && (
            <div className="flex items-center gap-2 self-start px-1 text-[12px] text-dim">
              <span className="shimmer-line h-[3px] w-24 rounded-full" /> analyzing…
            </div>
          )}
        </div>

        {/* Suggestions */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Sparkles size={12} className="mt-1 text-cyan-400/60" />
          {suggestions.map((s) => (
            <button key={s} className="chip" onClick={() => submitCommand(s, (p) => router.push(p))}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Active operations */}
      <div className="border-t border-line/60 px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-cyan-300/70">
          <CircleDot size={13} />
          <span className="hud-label !text-cyan-200/70">Active Ops</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {focusEndsAt && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-2.5 py-1.5 text-[12.5px] text-emerald-200">
              <span className="animate-blink h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#34d399]" />
              Focus session running · Focus Guard active
            </div>
          )}
          {activeTasks.map((t) => {
            const due = dueLabel(t.due);
            return (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border border-line/60 px-2.5 py-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: PRIORITY_COLOR[t.priority], boxShadow: `0 0 6px ${PRIORITY_COLOR[t.priority]}` }} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-icy/90">{t.title}</span>
                <span className={`text-[11px] ${due.urgent ? "text-rose-300" : "text-ghost"}`}>{due.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
