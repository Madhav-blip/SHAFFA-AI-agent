"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, ChevronDown, Eye, Loader2, Mail, Play, Shield, Siren, Sunrise, Zap } from "lucide-react";
import { GlassCard, NeonSwitch, PageTransition, relTime } from "@/components/ui/primitives";
import { useAutomationStore } from "@/lib/store/automations";
import type { Automation } from "@/lib/types";

const ICONS: Record<string, typeof Sunrise> = {
  sunrise: Sunrise, siren: Siren, brain: Brain, eye: Eye, mail: Mail, shield: Shield,
};

const STATUS_COLOR = { success: "#34d399", failed: "#fb7185", skipped: "#f59e0b" } as const;

function AutomationCard({ automation, index }: { automation: Automation; index: number }) {
  const { toggle, runNow, runningId } = useAutomationStore();
  const [expanded, setExpanded] = useState(false);
  const Icon = ICONS[automation.icon] ?? Zap;
  const running = runningId === automation.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
    >
      <GlassCard corners className={`p-4 transition-opacity ${automation.enabled ? "" : "opacity-65"}`}>
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
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-[15.5px] font-semibold text-cyan-50">{automation.name}</h3>
              <NeonSwitch on={automation.enabled} onToggle={() => toggle(automation.id)} />
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-dim">{automation.trigger}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-line px-2 py-0.5 font-display text-[9.5px] tracking-widest text-dim uppercase">{automation.schedule}</span>
              <span className="text-[11px] text-ghost">last run {relTime(automation.lastRun)}</span>
              <span className={`text-[11px] ${automation.successRate >= 0.95 ? "text-emerald-300" : "text-amber-300"}`}>
                {Math.round(automation.successRate * 100)}% success
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-line/50 pt-2.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex cursor-pointer items-center gap-1 text-[12px] text-dim transition-colors hover:text-cyan-200"
          >
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

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex flex-col gap-1.5 border-l border-line/60 pl-3">
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
          {enabled} of {automations.length} routines armed · triggers evaluated by the automation agent every 30s
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {automations.map((a, i) => <AutomationCard key={a.id} automation={a} index={i} />)}
      </div>
    </PageTransition>
  );
}
