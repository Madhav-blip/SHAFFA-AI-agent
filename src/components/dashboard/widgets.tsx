"use client";

import { motion } from "framer-motion";
import { AlarmClock, History, Lightbulb, ListTodo, TrendingUp } from "lucide-react";
import { GlassCard, PanelHeader, CATEGORY_COLOR, dueLabel, relTime } from "@/components/ui/primitives";
import { CountUp, ProgressRing, Sparkline } from "@/components/ui/charts";
import { useTaskStore } from "@/lib/store/tasks";
import { useJarvisStore } from "@/lib/store/jarvis";
import { useFocusStore, sessionsOn, todayKey } from "@/lib/store/focus";
import { useMemoryStore } from "@/lib/store/memory";

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line/60 px-3 py-4 text-center text-[13px] text-ghost">
      {text}
    </div>
  );
}

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
            <CountUp value={s.value} className="font-display text-[22px]" />
            <div className="hud-label !text-[9px]" style={{ color: s.color }}>{s.label}</div>
          </div>
        ))}
      </div>
      {open.length === 0 ? (
        <EmptyHint text="Board is clear. Say “add task: …” or ask SHAFFA to plan your day." />
      ) : (
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
      )}
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
      {upcoming.length === 0 ? (
        <EmptyHint text="No deadlines tracked. Tasks with due dates appear here — the Deadline Sentinel will warn you aloud." />
      ) : (
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
      )}
    </GlassCard>
  );
}

/* ---------- Productivity score (computed from real completions) ---------- */

export function ProductivityScore() {
  const tasks = useTaskStore((s) => s.tasks);
  const sessions = useFocusStore((s) => s.sessions);

  const done7d = tasks.filter((t) => t.completedAt && Date.now() - new Date(t.completedAt).getTime() < 7 * 86_400_000).length;
  const open = tasks.filter((t) => t.status !== "done").length;
  const focus7d = sessions.filter((s) => Date.now() - new Date(s.day).getTime() < 7 * 86_400_000);
  const focusBonus = Math.min(20, focus7d.length * 4);
  const score = done7d + open > 0 ? Math.min(100, Math.round((done7d / (done7d + open)) * 80) + focusBonus) : null;

  // completions per day, last 14 days
  const perDay = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(Date.now() - (13 - i) * 86_400_000).toISOString().slice(0, 10);
    return tasks.filter((t) => t.completedAt?.slice(0, 10) === day).length;
  });
  const hasTrend = perDay.some((v) => v > 0);

  return (
    <GlassCard corners className="p-5">
      <PanelHeader icon={<TrendingUp size={14} />} title="Productivity Score" />
      <div className="flex items-center gap-5">
        <ProgressRing value={(score ?? 0) / 100} size={108} stroke={8} color="#00e5ff">
          <span className="font-display text-[26px] text-cyan-50" style={{ textShadow: "0 0 16px rgba(0,229,255,0.5)" }}>
            {score ?? "—"}
          </span>
          <span className="hud-label !text-[9px]">{score === null ? "calibrating" : "/ 100"}</span>
        </ProgressRing>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] text-dim">
            {done7d} completed · {focus7d.length} focus session{focus7d.length === 1 ? "" : "s"} this week
          </span>
          {hasTrend ? (
            <Sparkline data={perDay} width={120} height={34} />
          ) : (
            <span className="text-[12px] text-ghost">Complete tasks and run focus sessions — the trend builds from real activity.</span>
          )}
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
      {log.length === 0 ? (
        <EmptyHint text="No commands yet. Press / to type one, click the mic, or say “hey shaffa”." />
      ) : (
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
      )}
    </GlassCard>
  );
}

/* ---------- Daily insights (rule-based, from live data) ---------- */

export function DailyInsights() {
  const tasks = useTaskStore((s) => s.tasks);
  const sessions = useFocusStore((s) => s.sessions);
  const memories = useMemoryStore((s) => s.memories);

  const now = Date.now();
  const overdue = tasks.filter((t) => t.status !== "done" && t.due && new Date(t.due).getTime() < now);
  const due24h = tasks.filter((t) => t.status !== "done" && t.due && new Date(t.due).getTime() - now > 0 && new Date(t.due).getTime() - now < 86_400_000);
  const focusToday = sessionsOn(sessions, todayKey());

  const insights: { text: string; warning: boolean }[] = [];
  if (overdue.length > 0)
    insights.push({ warning: true, text: `${overdue.length} task${overdue.length === 1 ? " is" : "s are"} overdue — “${overdue[0].title}” first. Say “complete ${overdue[0].title.split(" ")[0].toLowerCase()}…” when it is done.` });
  if (due24h.length > 0)
    insights.push({ warning: true, text: `${due24h.length} deadline${due24h.length === 1 ? "" : "s"} inside 24 hours. The Deadline Sentinel will remind you aloud.` });
  if (focusToday.length === 0)
    insights.push({ warning: false, text: "No focus sessions today yet. Say “start focus 50” — completed sessions feed your analytics." });
  else
    insights.push({ warning: false, text: `${focusToday.length} focus session${focusToday.length === 1 ? "" : "s"} logged today, ${focusToday.reduce((a, s) => a + s.minutes, 0)} minutes of deep work. Solid.` });
  if (memories.length === 0)
    insights.push({ warning: false, text: "Memory is empty. Say “remember that …” or import what Claude knows about you from the Memory screen." });

  return (
    <GlassCard corners className="p-5">
      <PanelHeader icon={<Lightbulb size={14} />} title="Daily Insights" />
      <div className="flex flex-col gap-2.5">
        {insights.slice(0, 3).map((ins, i) => (
          <motion.div
            key={ins.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.12 }}
            className={`rounded-lg border-l-2 py-2 pr-2 pl-3 text-[13.5px] leading-relaxed ${
              ins.warning ? "border-amber-400/80 bg-amber-400/[0.06] text-amber-100/90" : "border-cyan-400/60 bg-cyan-400/[0.04] text-icy"
            }`}
          >
            {ins.text}
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}
