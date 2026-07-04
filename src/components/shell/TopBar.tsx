"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Settings, X } from "lucide-react";
import { useJarvisStore } from "@/lib/store/jarvis";
import { NeonSwitch, relTime } from "@/components/ui/primitives";
import type { CoreState } from "@/lib/types";

const STATE_META: Record<CoreState, { label: string; color: string }> = {
  idle: { label: "Idle", color: "#22d3ee" },
  listening: { label: "Listening", color: "#2ee8b8" },
  processing: { label: "Thinking", color: "#b48cff" },
  responding: { label: "Responding", color: "#00e5ff" },
};

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <div className="h-9 w-40" />;
  return (
    <div className="flex flex-col items-center leading-none">
      <span className="font-display text-lg tracking-[0.28em] text-cyan-100" style={{ textShadow: "0 0 16px rgba(0,229,255,0.45)" }}>
        {now.toLocaleTimeString("en-GB")}
      </span>
      <span className="hud-label mt-1">
        {now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
      </span>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-9 w-9">
        <svg viewBox="0 0 40 40" className="h-full w-full animate-spin-slow text-cyan-300">
          <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="6 4" opacity="0.6" />
        </svg>
        <div className="absolute inset-[9px] rounded-full border border-cyan-300/70 bg-[radial-gradient(circle_at_40%_35%,rgba(0,229,255,0.85),rgba(4,10,18,0.9)_75%)] shadow-[0_0_14px_rgba(0,229,255,0.55)]" />
      </div>
      <div className="leading-none">
        <div className="font-display text-[17px] font-semibold tracking-[0.34em] text-cyan-100" style={{ textShadow: "0 0 18px rgba(0,229,255,0.5)" }}>
          S.H.A.F.F.A
        </div>
        <div className="hud-label mt-1">Personal AI Operating System</div>
      </div>
    </div>
  );
}

export default function TopBar() {
  const coreState = useJarvisStore((s) => s.coreState);
  const notifications = useJarvisStore((s) => s.notifications);
  const markAllRead = useJarvisStore((s) => s.markAllRead);
  const dismissNotification = useJarvisStore((s) => s.dismissNotification);
  const voiceOutput = useJarvisStore((s) => s.voiceOutput);
  const setVoiceOutput = useJarvisStore((s) => s.setVoiceOutput);
  const wakeEnabled = useJarvisStore((s) => s.wakeEnabled);
  const setWakeEnabled = useJarvisStore((s) => s.setWakeEnabled);
  const wakeWord = useJarvisStore((s) => s.wakeWord);
  const setWakeWord = useJarvisStore((s) => s.setWakeWord);

  const [open, setOpen] = useState<"none" | "bell" | "settings">("none");
  const unread = notifications.filter((n) => !n.read).length;
  const meta = STATE_META[coreState];

  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center justify-between border-b border-line/70 bg-abyss/70 px-5 backdrop-blur-xl">
      <Logo />
      <Clock />

      <div className="flex items-center gap-3">
        {/* AI status */}
        <div
          className="flex items-center gap-2 rounded-full border px-3.5 py-1.5 transition-colors duration-500"
          style={{ borderColor: `${meta.color}55`, background: `${meta.color}0d` }}
        >
          <span
            className={coreState === "idle" ? "" : "animate-blink"}
            style={{ width: 8, height: 8, borderRadius: 99, background: meta.color, boxShadow: `0 0 10px ${meta.color}`, display: "inline-block" }}
          />
          <span className="font-display text-[11px] tracking-[0.22em] uppercase" style={{ color: meta.color }}>
            {meta.label}
          </span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setOpen(open === "bell" ? "none" : "bell")}
            className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-line text-dim transition-all hover:border-cyan-400/50 hover:text-cyan-200 hover:shadow-[0_0_14px_rgba(0,229,255,0.15)]"
          >
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-[0_0_8px_rgba(244,63,94,0.8)]">
                {unread}
              </span>
            )}
          </button>
          <AnimatePresence>
            {open === "bell" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen("none")} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="glass absolute right-0 z-50 mt-2 w-96 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="hud-label !text-cyan-200/70">Notifications</span>
                    <button onClick={markAllRead} className="chip !text-[11px]">mark all read</button>
                  </div>
                  <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                    {notifications.length === 0 && <div className="py-6 text-center text-sm text-dim">All clear, sir.</div>}
                    {notifications.map((n) => (
                      <div key={n.id} className={`group flex gap-3 rounded-lg border border-line/60 p-3 ${n.read ? "opacity-55" : ""}`}>
                        <span
                          className="mt-1 h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background: n.kind === "alert" ? "#fb7185" : n.kind === "success" ? "#34d399" : "#38bdf8",
                            boxShadow: `0 0 8px ${n.kind === "alert" ? "#fb7185" : n.kind === "success" ? "#34d399" : "#38bdf8"}`,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-semibold text-cyan-100">{n.title}</div>
                          <div className="text-[13px] leading-snug text-dim">{n.detail}</div>
                          <div className="hud-label mt-1 !text-[9px]">{relTime(n.time)}</div>
                        </div>
                        <button onClick={() => dismissNotification(n.id)} className="cursor-pointer self-start text-ghost opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Settings */}
        <div className="relative">
          <button
            onClick={() => setOpen(open === "settings" ? "none" : "settings")}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-line text-dim transition-all hover:rotate-45 hover:border-cyan-400/50 hover:text-cyan-200 hover:shadow-[0_0_14px_rgba(0,229,255,0.15)]"
          >
            <Settings size={16} />
          </button>
          <AnimatePresence>
            {open === "settings" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen("none")} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="glass absolute right-0 z-50 mt-2 w-72 p-4"
                >
                  <span className="hud-label !text-cyan-200/70">System Settings</span>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <div className="text-[14px] font-semibold text-cyan-100">Voice responses</div>
                      <div className="text-[12px] text-dim">Speak replies aloud (TTS)</div>
                    </div>
                    <NeonSwitch on={voiceOutput} onToggle={() => setVoiceOutput(!voiceOutput)} />
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3">
                    <div>
                      <div className="text-[14px] font-semibold text-cyan-100">Wake word</div>
                      <div className="text-[12px] text-dim">Always listen for the wake phrase</div>
                    </div>
                    <NeonSwitch on={wakeEnabled} onToggle={() => setWakeEnabled(!wakeEnabled)} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[12.5px] text-dim">hey</span>
                    <input
                      value={wakeWord}
                      onChange={(e) => setWakeWord(e.target.value)}
                      spellCheck={false}
                      className="w-28 rounded-lg border border-line/70 bg-void/60 px-2.5 py-1 font-mono text-[13px] text-cyan-100 transition-all focus:border-cyan-400/50"
                    />
                    <span className="text-[11.5px] text-ghost">, morning briefing…</span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-snug text-ghost">
                    Needs mic permission · Chrome/Edge · listens while the app is open. “jarvis” always works too.
                  </p>

                  <div className="mt-4 border-t border-line/60 pt-3 text-[12px] leading-relaxed text-dim">
                    Core build <span className="text-cyan-300">v4.2.1</span> · local engine active · cloud reasoning link configured in{" "}
                    <span className="font-mono text-[11px]">server/.env</span>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
