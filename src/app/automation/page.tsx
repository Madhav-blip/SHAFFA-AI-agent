"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain, Check, ChevronDown, Eye, Loader2, Mail, MessageSquareText, Pencil, Play, Shield, Siren, Sparkles, Sunrise, Timer, Trash2, X, Zap,
} from "lucide-react";
import { GlassCard, NeonSwitch, PageTransition, relTime } from "@/components/ui/primitives";
import { useAutomationStore } from "@/lib/store/automations";
import type { Automation } from "@/lib/types";

const ICONS: Record<string, typeof Sunrise> = {
  sunrise: Sunrise, siren: Siren, brain: Brain, eye: Eye, mail: Mail, shield: Shield, zap: Zap,
};

const STATUS_COLOR = { success: "#34d399", failed: "#fb7185", skipped: "#f59e0b" } as const;

const ACTION_META = {
  command: { icon: MessageSquareText, label: "runs command", color: "#00e5ff" },
  remind: { icon: Siren, label: "speaks + notifies", color: "#f59e0b" },
  focus: { icon: Timer, label: "starts focus", color: "#34d399" },
} as const;

const EXAMPLES = [
  "every day at 9pm remind me to practice DSA",
  "every 2 hours tell me to drink water",
  "at 7am give me my morning briefing",
  "alert me when a deadline is within 12 hours",
];

function Creator() {
  const addFromText = useAutomationStore((s) => s.addFromText);
  const [text, setText] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  const create = () => {
    if (!text.trim()) return;
    const a = addFromText(text);
    setCreated(`Armed: ${a.name} — ${a.schedule}`);
    setText("");
    setTimeout(() => setCreated(null), 3500);
  };

  return (
    <GlassCard hover={false} className="p-4">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="shrink-0 text-cyan-400/70" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Tell SHAFFA what to do and when — plain English…"
          className="min-w-0 flex-1 bg-transparent text-[14.5px] text-cyan-50 placeholder:text-ghost"
          spellCheck={false}
        />
        <button
          onClick={create}
          disabled={!text.trim()}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-4 py-1.5 text-[13px] text-cyan-100 transition-all hover:bg-cyan-400/20 hover:shadow-[0_0_16px_rgba(0,229,255,0.3)] disabled:opacity-40"
        >
          <Zap size={13} /> Arm it
        </button>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {created ? (
          <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-[13px] text-emerald-300">
            {created} ✓
          </motion.span>
        ) : (
          EXAMPLES.map((ex) => (
            <button key={ex} className="chip !text-[11.5px]" onClick={() => setText(ex)}>
              {ex}
            </button>
          ))
        )}
      </div>
    </GlassCard>
  );
}

function AutomationCard({ automation, index }: { automation: Automation; index: number }) {
  const { toggle, update, remove, runNow, runningId } = useAutomationStore();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState(automation.trigger);
  const Icon = ICONS[automation.icon] ?? Zap;
  const running = runningId === automation.id;
  const action = automation.action ? ACTION_META[automation.action.kind] : null;

  const save = () => {
    if (draft.trim()) update(automation.id, { trigger: draft.trim(), name: "" });
    setEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ delay: index * 0.06 }}
    >
      <GlassCard corners className={`p-4 transition-opacity ${automation.enabled || editing ? "" : "opacity-65"}`}>
        <div className="flex items-start gap-3">
          <span
            className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-all ${
              automation.enabled ? "border-cyan-400/45 bg-cyan-400/10 text-cyan-300 shadow-[0_0_16px_rgba(0,229,255,0.15)]" : "border-line text-ghost"
            }`}
          >
            {running ? <Loader2 size={17} className="animate-spin" /> : <Icon size={17} />}
            {automation.enabled && !running && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#34d399]" />
            )}
          </span>

          {editing ? (
            <div className="min-w-0 flex-1">
              <span className="hud-label !text-[9px]">Instruction — schedule and action are re-parsed on save</span>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                autoFocus
                spellCheck={false}
                className="mt-1 w-full rounded-lg border border-line/70 bg-void/60 px-2.5 py-1.5 text-[13px] text-cyan-50 transition-all focus:border-cyan-400/50"
              />
              <div className="mt-2.5 flex items-center gap-2">
                <button onClick={save} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-1.5 text-[12.5px] text-emerald-200 hover:bg-emerald-400/20">
                  <Check size={12} /> Save
                </button>
                <button onClick={() => { setDraft(automation.trigger); setEditing(false); }} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-dim hover:text-icy">
                  <X size={12} /> Cancel
                </button>
                <div className="ml-auto">
                  {confirmDelete ? (
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11.5px] text-rose-300">delete?</span>
                      <button onClick={() => remove(automation.id)} className="cursor-pointer rounded-md border border-rose-400/50 bg-rose-400/10 px-2 py-1 text-[11.5px] text-rose-300 hover:bg-rose-400/20">yes</button>
                      <button onClick={() => setConfirmDelete(false)} className="cursor-pointer rounded-md border border-line px-2 py-1 text-[11.5px] text-dim">no</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)} className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-line text-ghost transition-all hover:border-rose-400/50 hover:text-rose-300" title="Delete automation">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-[15.5px] font-semibold text-cyan-50">{automation.name}</h3>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => { setDraft(automation.trigger); setEditing(true); }} className="grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-line text-ghost transition-all hover:border-cyan-400/50 hover:text-cyan-300" title="Edit automation">
                    <Pencil size={12} />
                  </button>
                  <NeonSwitch on={automation.enabled} onToggle={() => toggle(automation.id)} />
                </div>
              </div>
              <p className="mt-1 text-[12.5px] leading-snug text-dim">“{automation.trigger}”</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-line px-2 py-0.5 font-display text-[9.5px] tracking-widest text-dim uppercase">{automation.schedule}</span>
                {action && automation.action && (
                  <span className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]" style={{ borderColor: `${action.color}45`, color: action.color, background: `${action.color}0d` }}>
                    <action.icon size={10} /> {action.label}
                    {automation.action.kind !== "focus" && `: ${automation.action.payload.slice(0, 34)}${automation.action.payload.length > 34 ? "…" : ""}`}
                  </span>
                )}
                <span className="text-[11px] text-ghost">
                  {automation.history.length === 0 ? "never fired" : `fired ${automation.history.length}× · last ${relTime(automation.history[0].time)}`}
                </span>
              </div>
            </div>
          )}
        </div>

        {!editing && (
          <div className="mt-3 flex items-center justify-between border-t border-line/50 pt-2.5">
            <button onClick={() => setExpanded(!expanded)} className="flex cursor-pointer items-center gap-1 text-[12px] text-dim transition-colors hover:text-cyan-200">
              <ChevronDown size={13} className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
              execution history ({automation.history.length})
            </button>
            <button
              onClick={() => runNow(automation.id)}
              disabled={running}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-400/8 px-2.5 py-1 text-[12px] text-cyan-200 transition-all hover:bg-cyan-400/15 hover:shadow-[0_0_12px_rgba(0,229,255,0.2)] disabled:opacity-50"
            >
              {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              {running ? "executing…" : "run now"}
            </button>
          </div>
        )}

        <AnimatePresence>
          {expanded && !editing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex flex-col gap-1.5 border-l border-line/60 pl-3">
                {automation.history.length === 0 && <span className="text-[12px] text-ghost">no runs yet — it fires on schedule, or hit run now</span>}
                {automation.history.map((h) => (
                  <div key={h.id} className="relative flex items-baseline gap-2 text-[12px]">
                    <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[h.status], boxShadow: `0 0 6px ${STATUS_COLOR[h.status]}` }} />
                    <span className="shrink-0 text-ghost">{relTime(h.time)}</span>
                    <span className="text-icy/85">{h.detail}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

export default function AutomationScreen() {
  const automations = useAutomationStore((s) => s.automations);
  const enabled = automations.filter((a) => a.enabled).length;

  return (
    <PageTransition className="mx-auto flex max-w-6xl flex-col gap-4">
      <header>
        <h1 className="font-display text-[18px] tracking-[0.22em] text-cyan-50 uppercase" style={{ textShadow: "0 0 18px rgba(0,229,255,0.35)" }}>
          Automation Center
        </h1>
        <p className="mt-1 text-[13px] text-dim">
          {enabled} of {automations.length} routines armed · the runner checks triggers every 30 seconds and executes for real — reminders are spoken, commands go through the AI pipeline
        </p>
      </header>

      <Creator />

      <motion.div layout className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {automations.map((a, i) => (
            <AutomationCard key={a.id} automation={a} index={i} />
          ))}
        </AnimatePresence>
      </motion.div>
    </PageTransition>
  );
}
