"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Flame, Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { GlassCard, PageTransition } from "@/components/ui/primitives";
import { ProgressRing, Sparkline } from "@/components/ui/charts";
import { projectedDate, useGoalStore, weeksToComplete } from "@/lib/store/goals";
import { uid } from "@/lib/data/seed";
import type { Goal } from "@/lib/types";

const GOAL_COLORS = ["#00e5ff", "#f59e0b", "#a78bfa", "#34d399", "#fb7185"];

function GoalCreator({ onClose }: { onClose: () => void }) {
  const addGoal = useGoalStore((s) => s.addGoal);
  const count = useGoalStore((s) => s.goals.length);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("100");
  const [unit, setUnit] = useState("units");
  const [rate, setRate] = useState("5");

  const create = () => {
    const t = Math.max(1, parseInt(target, 10) || 100);
    if (!title.trim()) return;
    addGoal({
      id: uid(),
      title: title.trim(),
      unit: unit.trim() || "units",
      current: 0,
      target: t,
      weeklyRate: Math.max(0, parseInt(rate, 10) || 0),
      streakDays: 0,
      color: GOAL_COLORS[count % GOAL_COLORS.length],
      milestones: [0.25, 0.5, 0.75, 1].map((f) => ({
        label: f === 1 ? "Complete" : `${f * 100}%`,
        at: Math.round(t * f),
        done: false,
      })),
      history: [0],
    });
    onClose();
  };

  const field = "w-full rounded-lg border border-line/70 bg-void/60 px-2.5 py-1.5 text-[13.5px] text-cyan-50 transition-all focus:border-cyan-400/50";
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
      <GlassCard hover={false} className="p-4">
        <div className="hud-label mb-3 !text-cyan-200/70">New Objective</div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <label className="col-span-2 block">
            <span className="hud-label !text-[9px]">Goal</span>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="e.g. LeetCode problems solved" className={`mt-1 ${field}`} />
          </label>
          <label className="block">
            <span className="hud-label !text-[9px]">Target</span>
            <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" className={`mt-1 ${field}`} />
          </label>
          <label className="block">
            <span className="hud-label !text-[9px]">Unit</span>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="problems / % / sessions" className={`mt-1 ${field}`} />
          </label>
          <label className="block">
            <span className="hud-label !text-[9px]">Expected per week</span>
            <input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="numeric" className={`mt-1 ${field}`} />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={create} disabled={!title.trim()} className="flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-4 py-1.5 text-[13px] text-cyan-100 transition-all hover:bg-cyan-400/20 hover:shadow-[0_0_16px_rgba(0,229,255,0.3)] disabled:opacity-40">
            <Target size={13} /> Track it
          </button>
          <button onClick={onClose} className="chip">cancel</button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function MilestoneTimeline({ goal }: { goal: Goal }) {
  return (
    <div className="mt-3 flex items-center">
      {goal.milestones.map((m, i) => (
        <div key={m.label} className="flex flex-1 items-center last:flex-none">
          <div className="group relative flex flex-col items-center">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 400 }}
              className={`z-10 h-3 w-3 rounded-full border-2 ${
                m.done ? "border-transparent" : "border-line bg-panel"
              }`}
              style={m.done ? { background: goal.color, boxShadow: `0 0 10px ${goal.color}` } : undefined}
            />
            <span className={`absolute top-4 w-24 text-center text-[10px] leading-tight ${m.done ? "text-icy" : "text-ghost"}`}>
              {m.label}
            </span>
          </div>
          {i < goal.milestones.length - 1 && (
            <div className="relative mx-1 h-[2px] flex-1 overflow-hidden rounded-full bg-line/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: goal.milestones[i + 1].done ? "100%" : m.done ? "45%" : "0%" }}
                transition={{ duration: 0.9, delay: 0.3 + i * 0.12 }}
                className="h-full"
                style={{ background: goal.color, boxShadow: `0 0 6px ${goal.color}` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function GoalCard({ goal, index }: { goal: Goal; index: number }) {
  const increment = useGoalStore((s) => s.increment);
  const removeGoal = useGoalStore((s) => s.removeGoal);
  const pct = goal.current / goal.target;
  const weeks = weeksToComplete(goal);
  const eta = projectedDate(goal);
  const step = goal.unit === "%" ? 5 : goal.unit === "problems" ? 3 : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassCard corners className="p-5">
        <div className="flex gap-5">
          <ProgressRing value={pct} size={118} stroke={8} color={goal.color}>
            <span className="font-display text-[21px] text-cyan-50" style={{ textShadow: `0 0 14px ${goal.color}88` }}>
              {Math.round(pct * 100)}%
            </span>
            <span className="hud-label !text-[9px]">{goal.current}/{goal.target}</span>
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[16.5px] font-semibold text-cyan-50">{goal.title}</h3>
                <span className="text-[12px] tracking-wide text-dim">{goal.current} of {goal.target} {goal.unit}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => increment(goal.id, step)}
                  className="flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] transition-all hover:shadow-[0_0_14px_rgba(0,229,255,0.2)]"
                  style={{ borderColor: `${goal.color}55`, color: goal.color, background: `${goal.color}0d` }}
                >
                  <Plus size={12} /> log {step}
                </button>
                <button
                  onClick={() => removeGoal(goal.id)}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-line text-ghost transition-all hover:border-rose-400/50 hover:text-rose-300"
                  title="Delete goal"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11.5px] ${goal.streakDays > 0 ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-rose-400/40 bg-rose-400/10 text-rose-300"}`}>
                <Flame size={11} /> {goal.streakDays > 0 ? `${goal.streakDays}-day streak` : "streak broken"}
              </span>
              <span className="flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[11.5px] text-dim">
                <TrendingUp size={11} /> +{goal.weeklyRate} {goal.unit}/wk
              </span>
              {eta && (
                <span className="flex items-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-400/5 px-2 py-0.5 text-[11.5px] text-cyan-200">
                  <CalendarClock size={11} /> ETA {eta} · ~{weeks}w
                </span>
              )}
            </div>

            <div className="mt-2.5">
              <Sparkline data={goal.history} width={190} height={34} color={goal.color} />
            </div>
          </div>
        </div>

        <div className="px-2 pb-7">
          <MilestoneTimeline goal={goal} />
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function GoalsScreen() {
  const goals = useGoalStore((s) => s.goals);
  const [creating, setCreating] = useState(false);
  const avg = goals.length > 0 ? Math.round((goals.reduce((a, g) => a + g.current / g.target, 0) / goals.length) * 100) : 0;

  return (
    <PageTransition className="mx-auto flex max-w-6xl flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[18px] tracking-[0.22em] text-cyan-50 uppercase" style={{ textShadow: "0 0 18px rgba(0,229,255,0.35)" }}>
            Goal Tracker
          </h1>
          <p className="mt-1 text-[13px] text-dim">
            {goals.length === 0
              ? "No objectives yet — completion ETAs are projected from your real weekly velocity."
              : `${goals.length} active objective${goals.length === 1 ? "" : "s"} · ${avg}% aggregate completion · ETAs update as you log progress`}
          </p>
        </div>
        <button
          onClick={() => setCreating(!creating)}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-3.5 py-2 text-[13px] text-cyan-100 transition-all hover:bg-cyan-400/20 hover:shadow-[0_0_16px_rgba(0,229,255,0.3)]"
        >
          <Plus size={14} /> New goal
        </button>
      </header>

      <AnimatePresence>{creating && <GoalCreator onClose={() => setCreating(false)} />}</AnimatePresence>

      {goals.length === 0 && !creating ? (
        <GlassCard hover={false} className="flex flex-col items-center gap-3 py-14">
          <Target size={28} className="text-ghost" />
          <p className="max-w-md text-center text-[14px] leading-relaxed text-dim">
            Track anything measurable — problems solved, certification progress, applications sent, gym sessions.
            SHAFFA charts velocity, milestones, and a predicted completion date from what you actually log.
          </p>
          <button onClick={() => setCreating(true)} className="chip !px-4 !py-1.5 !text-[13px]">
            <Plus size={13} /> Create your first goal
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {goals.map((g, i) => <GoalCard key={g.id} goal={g} index={i} />)}
        </div>
      )}
    </PageTransition>
  );
}
