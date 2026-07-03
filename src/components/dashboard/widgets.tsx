"use client";

import { motion } from "framer-motion";
import { AlarmClock, History, Lightbulb, ListTodo, TrendingUp } from "lucide-react";
import { GlassCard, PanelHeader, CATEGORY_COLOR, dueLabel, relTime } from "@/components/ui/primitives";
import { ProgressRing, Sparkline } from "@/components/ui/charts";
import { useTaskStore } from "@/lib/store/tasks";
import { useJarvisStore } from "@/lib/store/jarvis";
import { analytics, dailyInsights } from "@/lib/data/seed";

/* ---------- Today overview ---------- */

export function TodayOverview() {
  const tasks = useTaskStore((s) => s.tasks);
  const open = tasks.filter((t) => t.status !== "done");
  const doneToday = tasks.filter((t) => t.completedAt && Date.now() - new Date(t.completedAt).getTime() < 86_400_000);
  const due24h = open.filter((t) => t.due && new Date(t.due).getTime() - Date.now() < 86_400_000);

  const byCategory = Object.entries(
    open.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.category]: (acc[t.category] ?? 0) + 1 }), {}),
  );

  return (
    <GlassCard corners className="p-5">
      <PanelHeader icon={<ListTodo size={14} />} title="Today Overview" />
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Open", value: open.length, color: "#38bdf8" },
          { label: "Due 24h", value: due24h.length, color: "#fb7185" },
          { label: "Done", value: doneToday.length, color: "#34d399" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-line/60 bg-void/40 py-2.5">
            <div className="font-display text-[22px]" style={{ color: s.color, textShadow: `0 0 14px ${s.color}66` }}>
              {s.value}
            </div>
            <div className="hud-label !text-[9px]">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {byCategory.map(([cat, count]) => (
          <div key={cat} className="flex items-center gap-2.5">
            <span className="w-20 text-[12.5px] text-dim">{cat}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(count / open.length) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: CATEGORY_COLOR[cat], boxShadow: `0 0 8px ${CATEGORY_COLOR[cat]}88` }}
              />
            </div>
            <span className="w-4 text-right text-[12px] text-ghost">{count}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

/* ---------- Upcoming deadlines ---------- */

export function UpcomingDeadlines() {
  const tasks = useTaskStore((s) => s.tasks);
  const upcoming = tasks
    .filter((t) => t.status !== "done" && t.due)
    .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""))
    .slice(0, 5);

  return (
    <GlassCard corners className="p-5">
      <PanelHeader icon={<AlarmClock size={14} />} title="Upcoming Deadlines" />
      <div className="flex flex-col gap-2">
        {upcoming.map((t, i) => {
          const due = dueLabel(t.due);
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center gap-3 rounded-lg border border-line/50 bg-void/30 px-3 py-2"
            >
              <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[t.category], boxShadow: `0 0 8px ${CATEGORY_COLOR[t.category]}` }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] text-icy">{t.title}</div>
                <div className="text-[11px] tracking-wide text-ghost">{t.category}</div>
              </div>
              <span
                className={`shrink-0 rounded-md border px-2 py-0.5 font-display text-[10.5px] tracking-wider ${
                  due.urgent ? "border-rose-400/50 bg-rose-400/10 text-rose-300" : "border-line text-dim"
                }`}
              >
                {due.text}
              </span>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}

/* ---------- Productivity score ---------- */

export function ProductivityScore() {
  const trend = analytics.productivity30d;
  const score = trend[trend.length - 1];
  const delta = score - trend[trend.length - 8];

  return (
    <GlassCard corners className="p-5">
      <PanelHeader icon={<TrendingUp size={14} />} title="Productivity Score" />
      <div className="flex items-center gap-5">
        <ProgressRing value={score / 100} size={108} stroke={8} color="#00e5ff">
          <span className="font-display text-[26px] text-cyan-50" style={{ textShadow: "0 0 16px rgba(0,229,255,0.5)" }}>
            {score}
          </span>
          <span className="hud-label !text-[9px]">/ 100</span>
        </ProgressRing>
        <div className="flex flex-col gap-1.5">
          <span className={`font-display text-[14px] ${delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} pts / week
          </span>
          <Sparkline data={trend.slice(-14)} width={120} height={34} />
          <span className="text-[12px] text-dim">Peak window 21:00–00:30</span>
        </div>
      </div>
    </GlassCard>
  );
}

/* ---------- Recent commands ---------- */

export function RecentCommands() {
  const log = useJarvisStore((s) => s.commandLog);
  return (
    <GlassCard corners className="p-5">
      <PanelHeader icon={<History size={14} />} title="Recent Commands" />
      <div className="flex flex-col gap-2">
        {log.slice(0, 4).map((c) => (
          <div key={c.id} className="rounded-lg border border-line/50 bg-void/30 px-3 py-2">
            <div className="flex items-center gap-2 font-mono text-[12.5px] text-cyan-200/90">
              <span className="text-cyan-500">❯</span>
              <span className="truncate">{c.input}</span>
              <span className="ml-auto shrink-0 text-[10.5px] text-ghost">{relTime(c.time)}</span>
            </div>
            <div className="mt-0.5 truncate pl-4 text-[12px] text-dim">{c.summary}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

/* ---------- Daily insights ---------- */

export function DailyInsights() {
  return (
    <GlassCard corners className="p-5">
      <PanelHeader icon={<Lightbulb size={14} />} title="Daily Insights" />
      <div className="flex flex-col gap-2.5">
        {dailyInsights.map((text, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.12 }}
            className={`rounded-lg border-l-2 py-2 pr-2 pl-3 text-[13.5px] leading-relaxed ${
              i === 0 ? "border-amber-400/80 bg-amber-400/[0.06] text-amber-100/90" : "border-cyan-400/60 bg-cyan-400/[0.04] text-icy"
            }`}
          >
            {text}
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}
