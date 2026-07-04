"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Ear, Mic, Send, Zap } from "lucide-react";
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
  onerror: ((e?: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
}

type SRWindow = {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | undefined {
  const w = window as unknown as SRWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function CommandBar() {
  const router = useRouter();
  const submitCommand = useJarvisStore((s) => s.submitCommand);
  const coreState = useJarvisStore((s) => s.coreState);
  const setCoreState = useJarvisStore((s) => s.setCoreState);
  const wakeEnabled = useJarvisStore((s) => s.wakeEnabled);
  const wakeWord = useJarvisStore((s) => s.wakeWord);

  const [value, setValue] = useState("");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  /** true after a bare wake word — the next utterance is the command */
  const awaitingRef = useRef(false);
  const awaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

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

  const armAwait = () => {
    awaitingRef.current = true;
    setCoreState("listening");
    if (awaitTimerRef.current) clearTimeout(awaitTimerRef.current);
    awaitTimerRef.current = setTimeout(() => {
      awaitingRef.current = false;
      if (useJarvisStore.getState().coreState === "listening") setCoreState("idle");
    }, 8000);
  };

  const disarmAwait = () => {
    awaitingRef.current = false;
    if (awaitTimerRef.current) clearTimeout(awaitTimerRef.current);
    if (useJarvisStore.getState().coreState === "listening") setCoreState("idle");
  };

  /* ---------- Wake mode: background speech recognition + clap trigger ---------- */
  useEffect(() => {
    if (!wakeEnabled) return;

    const speaking = () =>
      "speechSynthesis" in window && window.speechSynthesis.speaking;

    let stopped = false;
    let started = false;
    let rec: SpeechRecognitionLike | null = null;
    let raf = 0;
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let claps: number[] = [];
    let lastPeakAt = 0;

    /* --- path 1: continuous recognition for "hey shaffa …" --- */
    const startRecognition = () => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;
      const wakeRegex = new RegExp(
        `\\b(?:hey\\s+|ok\\s+|okay\\s+)?(?:${escapeRegExp(wakeWord.trim() || "shaffa")}|jarvis)\\b`,
        "i",
      );

      rec = new Ctor();
      rec.lang = "en-IN";
      rec.continuous = true;
      rec.interimResults = false;

      rec.onresult = (e) => {
        const last = e.results[e.results.length - 1];
        const transcript = (last?.[0]?.transcript ?? "").trim();
        if (!transcript) return;

        const state = useJarvisStore.getState().coreState;
        // Ignore anything heard while SHAFFA is thinking or reading a
        // response aloud (avoids capturing its own TTS output).
        if (state === "processing" || state === "responding" || speaking()) return;

        const m = transcript.match(wakeRegex);
        if (m) {
          const command = transcript.slice((m.index ?? 0) + m[0].length).replace(/^[\s,!.]+/, "");
          if (command) {
            disarmAwait();
            run(command);
          } else {
            armAwait(); // bare "hey shaffa" — wait for the follow-up
          }
        } else if (awaitingRef.current) {
          disarmAwait();
          run(transcript);
        }
      };

      rec.onerror = (e) => {
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
          // Mic blocked: pause for this session only. Keep the setting ON so
          // wake mode comes back the moment permission is granted.
          stopped = true;
          disarmAwait();
        }
      };
      // Browsers stop continuous recognition after silence — restart quietly.
      rec.onend = () => {
        if (!stopped) {
          try { rec?.start(); } catch { /* already restarting */ }
        }
      };

      try { rec.start(); } catch { /* mic busy */ }
      recRef.current = rec;
    };

    /* --- path 2: triple-clap trigger (works without SpeechRecognition) --- */
    const startClaps = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
        const Ctx = w.AudioContext ?? w.webkitAudioContext;
        if (!Ctx || stopped) return;
        audioCtx = new Ctx();
        if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        audioCtx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);

        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let peak = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = Math.abs(buf[i] - 128) / 128;
            if (v > peak) peak = v;
          }
          const now = performance.now();
          // A clap is a sharp, loud transient; three inside 1.8s arms SHAFFA.
          if (peak > 0.6 && now - lastPeakAt > 150 && !speaking()) {
            lastPeakAt = now;
            claps = claps.filter((t) => now - t < 1800);
            claps.push(now);
            if (claps.length >= 3) {
              claps = [];
              if (useJarvisStore.getState().coreState === "idle") armAwait();
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch { /* mic unavailable — clap trigger stays off */ }
    };

    const startAll = () => {
      if (started || stopped) return;
      started = true;
      startRecognition();
      startClaps();
    };

    // Don't fire a permission prompt on page load — browsers suppress or
    // penalize that. Start immediately only when the mic is already granted;
    // otherwise arm on the first user gesture (which lets the prompt show).
    const gestureStart = () => {
      audioCtx?.resume().catch(() => {});
      startAll();
    };
    window.addEventListener("pointerdown", gestureStart);

    (async () => {
      try {
        const perm = navigator.permissions?.query
          ? await navigator.permissions.query({ name: "microphone" as PermissionName })
          : null;
        if (!stopped && perm?.state === "granted") startAll();
      } catch { /* Permissions API unavailable — wait for the gesture */ }
    })();

    return () => {
      stopped = true;
      window.removeEventListener("pointerdown", gestureStart);
      if (rec) {
        rec.onend = null;
        try { rec.stop(); } catch { /* already stopped */ }
      }
      recRef.current = null;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakeEnabled, wakeWord]);

  /* ---------- Mic button ---------- */
  const toggleVoice = () => {
    // With wake mode armed, the mic button just opens a command window —
    // the background recognizer is already running.
    if (wakeEnabled && getRecognitionCtor()) {
      if (coreState === "listening") disarmAwait();
      else armAwait();
      return;
    }

    if (coreState === "listening") {
      recRef.current?.stop();
      setCoreState("idle");
      return;
    }
    const Ctor = getRecognitionCtor();
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
  const wakeArmed = mounted && wakeEnabled;

  return (
    <div className="relative z-30 shrink-0 px-6 pb-5">
      <div className="glass flex items-center gap-3 !rounded-2xl px-4 py-3">
        {/* Voice */}
        <div className="relative shrink-0">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggleVoice}
            title={wakeArmed ? `Wake word armed — say “hey ${wakeWord}” or triple clap` : "Voice input"}
            className={`relative grid h-11 w-11 cursor-pointer place-items-center rounded-full border transition-all duration-300 ${
              listening
                ? "border-emerald-300/70 bg-emerald-400/15 text-emerald-200 shadow-[0_0_22px_rgba(46,232,184,0.4)]"
                : "border-cyan-400/40 bg-cyan-400/10 text-cyan-200 hover:shadow-[0_0_18px_rgba(0,229,255,0.3)]"
            }`}
          >
            {listening && <span className="animate-ring-ping absolute inset-0 rounded-full border border-emerald-300/60" />}
            <Mic size={18} />
          </motion.button>
          {wakeArmed && (
            <span
              className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full border border-emerald-300/60 bg-emerald-400/20 text-emerald-300 shadow-[0_0_8px_rgba(46,232,184,0.5)]"
              title={`Always listening for “hey ${wakeWord}”`}
            >
              <Ear size={9} />
            </span>
          )}
        </div>

        {/* Command line */}
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line/70 bg-void/60 px-3.5 py-2.5 transition-all focus-within:border-cyan-400/50 focus-within:shadow-[0_0_18px_rgba(0,229,255,0.12)]">
          <span className="font-mono text-[13px] text-cyan-400/80">❯</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run(value)}
            placeholder={
              listening
                ? "Listening…"
                : wakeArmed
                  ? `Armed — say “hey ${wakeWord}, morning briefing” or triple clap, or type here   ( / to focus )`
                  : "Command SHAFFA — try “add task: …”, “start focus 50”, or paste an error   ( / to focus )"
            }
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
