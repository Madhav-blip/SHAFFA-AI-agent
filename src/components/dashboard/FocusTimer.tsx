"use client";

import { useEffect, useState } from "react";
import { Pause, Play, TimerReset } from "lucide-react";
import { GlassCard, PanelHeader } from "@/components/ui/primitives";
import { ProgressRing } from "@/components/ui/charts";
import { sessionsOn, todayKey, useFocusStore } from "@/lib/store/focus";

const PRESETS = [25, 50, 90];

export default function FocusTimer() {
  const { endsAt, minutes, sessions, start, stop } = useFocusStore();
  const sessionsToday = sessionsOn(sessions, todayKey()).length;
  const [now, setNow] = useState(() => Date.now());
  const [preset, setPreset] = useState(50);

  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [endsAt]);

  const running = endsAt !== null;
  const remainingMs = running ? Math.max(0, endsAt - now) : preset * 60_000;
  const totalMs = (running ? minutes : preset) * 60_000;

  useEffect(() => {
    if (running && remainingMs === 0) stop(true);
  }, [running, remainingMs, stop]);

  const mm = String(Math.floor(remainingMs / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((remainingMs % 60_000) / 1000)).padStart(2, "0");

  return (
    <GlassCard corners className="flex flex-col items-center p-5">
      <PanelHeader title="Focus Timer" right={<span className="hud-label">{sessionsToday} sessions today</span>} />
      <ProgressRing value={remainingMs / totalMs} size={132} stroke={8} color={running ? "#2ee8b8" : "#00e5ff"}>
        <span className="font-display text-[26px] tracking-wider text-cyan-50" style={{ textShadow: "0 0 16px rgba(0,229,255,0.4)" }}>
          {mm}:{ss}
        </span>
        <span className="hud-label !text-[9px]">{running ? "deep work" : "ready"}</span>
      </ProgressRing>

      <div className="mt-3 flex items-center gap-2">
        {!running &&
          PRESETS.map((p) => (
            <button key={p} data-active={preset === p} className="chip" onClick={() => setPreset(p)}>
              {p}m
            </button>
          ))}
        {running ? (
          <button
            onClick={() => stop(false)}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-rose-400/40 bg-rose-400/10 px-4 py-1.5 text-[13px] text-rose-200 transition-all hover:shadow-[0_0_16px_rgba(251,113,133,0.25)]"
          >
            <Pause size={13} /> End session
          </button>
        ) : (
          <button
            onClick={() => start(preset)}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-4 py-1.5 text-[13px] text-cyan-100 transition-all hover:bg-cyan-400/20 hover:shadow-[0_0_16px_rgba(0,229,255,0.3)]"
          >
            <Play size={13} /> Engage
          </button>
        )}
        {!running && (
          <button onClick={() => setPreset(50)} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-line text-ghost hover:text-cyan-300">
            <TimerReset size={13} />
          </button>
        )}
      </div>
    </GlassCard>
  );
}
