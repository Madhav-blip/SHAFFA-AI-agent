"use client";

import { useMemo, useState, type DragEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Columns3, GripVertical, List, Plus, Repeat, Trash2 } from "lucide-react";
import { CATEGORY_COLOR, GlassCard, PageTransition, PRIORITY_COLOR, dueLabel } from "@/components/ui/primitives";
import { useTaskStore } from "@/lib/store/tasks";
import { guessCategory } from "@/lib/ai/engine";
import { uid, daysFromNow } from "@/lib/data/seed";
import type { Category, Task, TaskStatus } from "@/lib/types";

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "progress", label: "In Progress" },
  { id: "done", label: "Complete" },
];

const CATEGORIES: (Category | "All")[] = ["All", "College", "DSA", "Internship", "Personal", "Fitness"];

function TaskCard({ task, draggable = true }: { task: Task; draggable?: boolean }) {
  const { moveTask, removeTask } = useTaskStore();
  const due = dueLabel(task.due);
  const done = task.status === "done";
  const justCompleted = !!task.completedAt && Date.now() - new Date(task.completedAt).getTime() < 4000;

  return (
    <motion.div
      layout
      layoutId={task.id}
      initial={{ opacity: 0, y: 10 }}
      animate={justCompleted ? { opacity: 1, y: 0, scale: [1, 1.05, 1] } : { opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={
        justCompleted
          ? { duration: 0.45, ease: "easeOut" }
          : { type: "spring", stiffness: 400, damping: 32 }
      }
      draggable={draggable}
      onDragStart={(e) => {
        (e as unknown as DragEvent<HTMLDivElement>).dataTransfer?.setData("text/task", task.id);
      }}
      className={`group glass glass-hover relative cursor-grab rounded-xl p-3.5 active:cursor-grabbing ${done ? "opacity-60" : ""}`}
    >
      {justCompleted && (
        <span className="animate-ring-ping pointer-events-none absolute inset-0 rounded-xl border-2 border-emerald-300/70" />
      )}
      <div className="flex items-start gap-2.5">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORITY_COLOR[task.priority], boxShadow: `0 0 8px ${PRIORITY_COLOR[task.priority]}` }} title={`${task.priority} priority`} />
        <div className="min-w-0 flex-1">
          <div className={`text-[14px] leading-snug ${done ? "text-dim line-through" : "text-cyan-50/95"}`}>{task.title}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md border px-1.5 py-0.5 text-[10.5px] tracking-wider" style={{ borderColor: `${CATEGORY_COLOR[task.category]}55`, color: CATEGORY_COLOR[task.category], background: `${CATEGORY_COLOR[task.category]}0d` }}>
              {task.category}
            </span>
            {task.recurring && (
              <span className="flex items-center gap-1 text-[10.5px] text-dim"><Repeat size={10} /> {task.recurring}</span>
            )}
            {task.due && !done && (
              <span className={`text-[11px] ${due.urgent ? "text-rose-300" : "text-ghost"}`}>{due.text}</span>
            )}
          </div>
        </div>
        <GripVertical size={13} className="mt-1 shrink-0 text-ghost/50 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-2 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!done && (
          <button onClick={() => moveTask(task.id, "done")} className="flex cursor-pointer items-center gap-1 rounded-md border border-emerald-400/40 px-2 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-400/10">
            <CheckCircle2 size={11} /> done
          </button>
        )}
        <button onClick={() => removeTask(task.id)} className="grid h-6 w-6 cursor-pointer place-items-center rounded-md border border-line text-ghost hover:border-rose-400/40 hover:text-rose-300">
          <Trash2 size={11} />
        </button>
      </div>
    </motion.div>
  );
}

function KanbanColumn({ status, label, tasks }: { status: TaskStatus; label: string; tasks: Task[] }) {
  const moveTask = useTaskStore((s) => s.moveTask);
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/task");
        if (id) moveTask(id, status);
      }}
      className={`flex min-h-[420px] flex-1 flex-col rounded-2xl border p-3 transition-all duration-200 ${
        over ? "border-cyan-400/60 bg-cyan-400/[0.05] shadow-[inset_0_0_28px_rgba(0,229,255,0.07)]" : "border-line/50 bg-panel/40"
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="hud-label !text-cyan-200/70">{label}</span>
        <span className="grid h-5 min-w-5 place-items-center rounded-md bg-line/50 px-1 font-display text-[10px] text-dim">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        <AnimatePresence mode="popLayout">
          {tasks.map((t) => <TaskCard key={t.id} task={t} />)}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function TasksScreen() {
  const { tasks, view, filter, setView, setFilter, addTask, moveTask } = useTaskStore();
  const [title, setTitle] = useState("");

  const filtered = useMemo(
    () => tasks.filter((t) => filter === "All" || t.category === filter),
    [tasks, filter],
  );

  const add = () => {
    if (!title.trim()) return;
    addTask({ id: uid(), title: title.trim(), category: guessCategory(title), priority: "medium", status: "backlog", due: daysFromNow(2), createdAt: new Date().toISOString() });
    setTitle("");
  };

  const doneCount = filtered.filter((t) => t.status === "done").length;
  const progress = filtered.length ? doneCount / filtered.length : 0;

  return (
    <PageTransition className="mx-auto flex max-w-6xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[18px] tracking-[0.22em] text-cyan-50 uppercase" style={{ textShadow: "0 0 18px rgba(0,229,255,0.35)" }}>
            Task Grid
          </h1>
          <p className="mt-1 text-[13px] text-dim">{filtered.length - doneCount} open · {doneCount} complete · drag cards between columns</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-line/70 bg-panel/60 p-1">
          {([["kanban", Columns3], ["list", List]] as const).map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-display text-[10.5px] tracking-widest uppercase transition-all ${
                view === v ? "bg-cyan-400/15 text-cyan-200 shadow-[0_0_12px_rgba(0,229,255,0.15)]" : "text-dim hover:text-cyan-200/70"
              }`}
            >
              <Icon size={13} /> {v}
            </button>
          ))}
        </div>
      </header>

      {/* Progress + filters + quick add */}
      <GlassCard hover={false} className="flex flex-wrap items-center gap-4 p-3.5">
        <div className="flex min-w-44 items-center gap-3">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-line/50">
            <motion.div animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-300" style={{ boxShadow: "0 0 10px rgba(0,229,255,0.5)" }} />
          </div>
          <span className="font-display text-[12px] text-cyan-200">{Math.round(progress * 100)}%</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c} className="chip" data-active={filter === c} onClick={() => setFilter(c)}>
              {c !== "All" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: CATEGORY_COLOR[c] }} />}
              {c}
            </button>
          ))}
        </div>
        <div className="flex min-w-60 flex-1 items-center gap-2 rounded-lg border border-line/70 bg-void/50 px-3 py-1.5 transition-all focus-within:border-cyan-400/50">
          <Plus size={14} className="text-cyan-400/70" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Quick add — category is auto-detected…"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-cyan-50 placeholder:text-ghost"
          />
        </div>
      </GlassCard>

      {view === "kanban" ? (
        <div className="flex flex-col gap-4 lg:flex-row">
          {COLUMNS.map((c) => (
            <KanbanColumn key={c.id} status={c.id} label={c.label} tasks={filtered.filter((t) => t.status === c.id)} />
          ))}
        </div>
      ) : (
        <GlassCard hover={false} className="p-3">
          <AnimatePresence mode="popLayout">
            {[...filtered]
              .sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) || (a.due ?? "9999").localeCompare(b.due ?? "9999"))
              .map((t) => {
                const due = dueLabel(t.due);
                const done = t.status === "done";
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="group flex items-center gap-3 border-b border-line/40 px-2 py-2.5 last:border-0"
                  >
                    <button
                      onClick={() => moveTask(t.id, done ? "backlog" : "done")}
                      className={`grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-md border transition-all ${
                        done ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300" : "border-line text-transparent hover:border-cyan-400/60 hover:text-cyan-400/50"
                      }`}
                    >
                      <CheckCircle2 size={12} />
                    </button>
                    <span className={`min-w-0 flex-1 truncate text-[14px] ${done ? "text-dim line-through" : "text-cyan-50/95"}`}>{t.title}</span>
                    {t.recurring && <Repeat size={11} className="shrink-0 text-ghost" />}
                    <span className="shrink-0 rounded-md border px-1.5 py-0.5 text-[10.5px]" style={{ borderColor: `${CATEGORY_COLOR[t.category]}55`, color: CATEGORY_COLOR[t.category] }}>{t.category}</span>
                    <span className="w-14 shrink-0 text-right text-[11px]" style={{ color: PRIORITY_COLOR[t.priority] }}>{t.priority}</span>
                    <span className={`w-16 shrink-0 text-right text-[11px] ${due.urgent && !done ? "text-rose-300" : "text-ghost"}`}>{done ? "✓" : due.text}</span>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </GlassCard>
      )}
    </PageTransition>
  );
}
