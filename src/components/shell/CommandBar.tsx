"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mic, Send, Zap } from "lucide-react";
import { useJarvisStore } from "@/lib/store/jarvis";

const SHORTCUTS = [
  "morning briefing",
  "what is due today",
  "start focus 50",
  "add task: revise dp patterns",
  "system status",
];

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SRWindow = {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export default function CommandBar() {
  const router = useRouter();
  const submitCommand = useJarvisStore((s) => s.submitCommand);
  const coreState = useJarvisStore((s) => s.coreState);
  const setCoreState = useJarvisStore((s) => s.setCoreState);

  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  // "/" focuses the command line from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(target.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (text: string) => {
    if (!text.trim()) return;
    setValue("");
    submitCommand(text, (path) => router.push(path));
  };

  const toggleVoice = () => {
    if (coreState === "listening") {
      recRef.current?.stop();
      setCoreState("idle");
      return;
    }
    const w = window as unknown as SRWindow;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (Ctor) {
      const rec = new Ctor();
      recRef.current = rec;
      rec.lang = "en-IN";
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript ?? "";
        if (transcript) run(transcript);
      };
      rec.onend = () => {
        if (useJarvisStore.getState().coreState === "listening") setCoreState("idle");
      };
      rec.onerror = () => setCoreState("idle");
      setCoreState("listening");
      rec.start();
    } else {
      // No STT available — simulate the wake-word pipeline for the demo
      setCoreState("listening");
      setTimeout(() => run("morning briefing"), 2200);
    }
  };

  const listening = coreState === "listening";

  return (
    <div className="relative z-30 shrink-0 px-6 pb-5">
      <div className="glass flex items-center gap-3 !rounded-2xl px-4 py-3">
        {/* Voice */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={toggleVoice}
          className={`relative grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border transition-all duration-300 ${
            listening
              ? "border-emerald-300/70 bg-emerald-400/15 text-emerald-200 shadow-[0_0_22px_rgba(46,232,184,0.4)]"
              : "border-cyan-400/40 bg-cyan-400/10 text-cyan-200 hover:shadow-[0_0_18px_rgba(0,229,255,0.3)]"
          }`}
        >
          {listening && <span className="animate-ring-ping absolute inset-0 rounded-full border border-emerald-300/60" />}
          <Mic size={18} />
        </motion.button>

        {/* Command line */}
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line/70 bg-void/60 px-3.5 py-2.5 transition-all focus-within:border-cyan-400/50 focus-within:shadow-[0_0_18px_rgba(0,229,255,0.12)]">
          <span className="font-mono text-[13px] text-cyan-400/80">❯</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run(value)}
            placeholder={listening ? "Listening…" : "Command JARVIS — try “add task: …”, “start focus 50”, or paste an error   ( / to focus )"}
            className="min-w-0 flex-1 bg-transparent text-[14.5px] text-cyan-50 placeholder:text-ghost"
            spellCheck={false}
          />
          <button
            onClick={() => run(value)}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-cyan-400/40 bg-cyan-400/10 text-cyan-200 transition-all hover:bg-cyan-400/20 hover:shadow-[0_0_14px_rgba(0,229,255,0.3)]"
          >
            <Send size={14} />
          </button>
        </div>

        {/* Shortcuts */}
        <div className="hidden items-center gap-1.5 2xl:flex">
          <Zap size={13} className="text-cyan-400/50" />
          {SHORTCUTS.slice(0, 3).map((s) => (
            <button key={s} className="chip" onClick={() => run(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
