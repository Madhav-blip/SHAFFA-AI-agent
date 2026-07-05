"use client";

import { motion } from "framer-motion";
import { Activity, BrainCircuit, CheckCircle2, Clock3, Flame, ListTodo, Sparkles } from "lucide-react";
import { CATEGORY_COLOR, GlassCard, PageTransition, PanelHeader } from "@/components/ui/primitives";
import { AreaChart, BarChart, CountUp, Donut, Heatmap } from "@/components/ui/charts";
import { useTaskStore } from "@/lib/store/tasks";
import { useFocusStore, sessionsOn, todayKey } from "@/lib/store/focus";
import { useAutomationStore } from "@/lib/store/automations";

function dayKey(offset: number): string {
  return new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
}

function AwaitingTelemetry({ hint }: { hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="hud-label">Awaiting telemetry</span>
      <p className="max-w-sm text-[13px] leading-relaxed text-ghost">{hint}</p>
    </div>
  );
}

export default function AnalyticsScreen() {
  const tasks = useTaskStore((s) => s.tasks);
  const sessions = useFocusStore((s) => s.sessions);
  const automations = useAutomationStore((s) => s.automations);

  /* ---- real telemetry ---- */
  const done = tasks.filter((t) => t.completedAt);
  const done7d = done.filter((t) => Date.now() - new Date(t.completedAt!).getTime() < 7 * 86_400_000);
  const open = tasks.filter((t) => t.status !== "done");
  const focusToday = sessionsOn(sessions, todayKey()).reduce((a, s) => a + s.minutes, 0);
  const focus7d = sessions.filter((s) => Date.now() - new Date(s.day).getTime() < 7 * 86_400_000);
  const automationFires = automations.reduce((a, x) => a + x.history.length, 0);

  const donePerDay = Array.from({ length: 14 }, (_, i) =>
    done.filter((t) => t.completedAt!.slice(0, 10) === dayKey(13 - i)).length,
  );
  const focusPerDay = Array.from({ length: 7 }, (_, i) => ({
    label: new Date(Date.now() - (6 - i) * 86_400_000).toLocaleDateString(undefined, { weekday: "short" }),
    value: Math.round(sessionsOn(sessions, dayKey(6 - i)).reduce((a, s) => a + s.minutes, 0) / 6) / 10,
  }));
  const byCategory = Object.entries(
    done.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.category]: (acc[t.category] ?? 0) + 1 }), {}),
  ).map(([label, value]) => ({ label, value, color: CATEGORY_COLOR[label] ?? "#38bdf8" }));
  const heat = Array.from({ length: 12 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const key = dayKey((11 - w) * 7 + (6 - d));
      const completions = done.filter((t) => t.completedAt!.slice(0, 10) === key).length;
      const focusMin = sessionsOn(sessions, key).reduce((a, s) => a + s.minutes, 0);
      return Math.min(4, completions + (focusMin > 0 ? 1 : 0) + (focusMin > 100 ? 1 : 0));
    }),
  );

  /* ---- rule-based insights from real signals ---- */
  const insights: { text: string; kind: "warning" | "positive" }[] = [];
  const overdue = open.filter((t) => t.due && new Date(t.due).getTime() < Date.now()).length;
  if (overdue > 0) insights.push({ kind: "warning", text: `${overdue} task${overdue === 1 ? " is" : "s are"} overdue — clearing them first protects the completion streak.` });
  if (focus7d.length > 0) insights.push({ kind: "positive", text: `${focus7d.length} focus session${focus7d.length === 1 ? "" : "s"} this week totalling ${focus7d.reduce((a, s) => a + s.minutes, 0)} minutes of deep work.` });
  else insights.push({ kind: "warning", text: "No completed focus sessions this week — the timer on the dashboard feeds this entire page." });
  if (done7d.length >= 3) insights.push({ kind: "positive", text: `${done7d.length} tasks closed in 7 days. Momentum is real — SHAFFA's productivity score is climbing.` });
  if (automationFires > 0) insights.push({ kind: "positive", text: `Automations fired ${automationFires} time${automationFires === 1 ? "" : "s"} on your behalf so far.` });
  if (tasks.length === 0) insights.push({ kind: "warning", text: "No task history yet. Everything on this page is computed from real activity — it sharpens within days of normal use." });

  const STATS = [
    { label: "Focus today", value: Math.round((focusToday / 60) * 10) / 10, suffix: "h", icon: Clock3, color: "#00e5ff", decimals: 1 },
    { label: "Done · 7 days", value: done7d.length, suffix: "", icon: CheckCircle2, color: "#34d399", decimals: 0 },
    { label: "Open tasks", value: open.length, suffix: "", icon: ListTodo, color: "#a78bfa", decimals: 0 },
    { label: "Automation fires", value: automationFires, suffix: "", icon: Flame, color: "#f59e0b", decimals: 0 },
  ];

  return (
    <PageTransition className="mx-auto flex max-w-6xl flex-col gap-4">
      <header>
        <h1 className="font-display text-[18px] tracking-[0.22em] text-cyan-50 uppercase" style={{ textShadow: "0 0 18px rgba(0,229,255,0.35)" }}>
          Analytics Core
        </h1>
        <p className="mt-1 text-[13px] text-dim">Live telemetry — every chart is computed from your actual tasks, focus sessions, and automations</p>
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <GlassCard className="flex items-center gap-3 px-4 py-3.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl border" style={{ borderColor: `${s.color}45`, background: `${s.color}0d`, color: s.color }}>
                <s.icon size={17} />
              </span>
              <div>
                <CountUp value={s.value} suffix={s.suffix} decimals={s.decimals} className="font-display text-[19px] leading-none text-cyan-50" />
                <div className="hud-label mt-1 !text-[9px]">{s.label}</div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GlassCard corners className="p-5">
          <PanelHeader icon={<CheckCircle2 size={14} />} title="Tasks Completed — 14 days" />
          {donePerDay.some((v) => v > 0) ? (
            <AreaChart data={donePerDay} yLabel="TASKS" />
          ) : (
            <AwaitingTelemetry hint="Complete tasks and this trend draws itself." />
          )}
        </GlassCard>

        <GlassCard corners className="p-5">
          <PanelHeader icon={<Clock3 size={14} />} title="Focus Hours — last 7 days" />
          {focusPerDay.some((d) => d.value > 0) ? (
            <BarChart data={focusPerDay} color="#a78bfa" unit="h" />
          ) : (
            <AwaitingTelemetry hint="Finish a focus session on the dashboard — completed sessions land here as hours per day." />
          )}
        </GlassCard>

        <GlassCard corners className="p-5">
          <PanelHeader icon={<Activity size={14} />} title="Completions by Category" />
          {byCategory.length > 0 ? (
            <div className="flex items-center gap-5">
              <Donut segments={byCategory} />
              <div className="flex flex-col gap-1.5">
                {byCategory.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 text-[12.5px]">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                    <span className="w-20 text-dim">{s.label}</span>
                    <span className="font-display text-[11px] text-icy">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <AwaitingTelemetry hint="Category split appears after your first completed task." />
          )}
        </GlassCard>

        <GlassCard corners className="p-5">
          <PanelHeader icon={<Flame size={14} />} title="12-Week Consistency" />
          <div className="flex flex-col gap-2">
            <Heatmap grid={heat} />
            <span className="text-[11.5px] text-ghost">One cell per day — intensity from completed tasks and deep-work minutes.</span>
          </div>
        </GlassCard>
      </div>

      {/* AI insights */}
      <GlassCard corners className="p-5">
        <PanelHeader icon={<BrainCircuit size={14} />} title="Insights" right={<Sparkles size={13} className="text-cyan-400/60" />} />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {insights.slice(0, 4).map((ins, i) => (
            <motion.div
              key={ins.text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className={`rounded-xl border p-3.5 text-[13.5px] leading-relaxed ${
                ins.kind === "warning"
                  ? "border-amber-400/30 bg-amber-400/[0.05] text-amber-100/90"
                  : "border-emerald-400/30 bg-emerald-400/[0.05] text-emerald-100/90"
              }`}
            >
              {ins.text}
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </PageTransition>
  );
}
