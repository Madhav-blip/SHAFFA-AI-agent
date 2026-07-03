"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/* ---------- GlassCard ---------- */

export function GlassCard({
  children,
  className = "",
  hover = true,
  corners = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  corners?: boolean;
}) {
  return (
    <div className={`glass ${hover ? "glass-hover" : ""} ${corners ? "hud-corners" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ---------- Panel header ---------- */

export function PanelHeader({
  icon,
  title,
  right,
}: {
  icon?: ReactNode;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-cyan-300/80">
        {icon}
        <span className="hud-label !text-cyan-200/70">{title}</span>
      </div>
      {right}
    </div>
  );
}

/* ---------- Neon switch ---------- */

export function NeonSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-all duration-300 ${
        on
          ? "border-cyan-400/60 bg-cyan-400/15 shadow-[0_0_14px_rgba(0,229,255,0.25)]"
          : "border-line bg-panel"
      }`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={`absolute top-[3px] h-4 w-4 rounded-full ${
          on
            ? "right-[3px] bg-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.8)]"
            : "left-[3px] bg-ghost"
        }`}
      />
    </button>
  );
}

/* ---------- Page transition wrapper ---------- */

export function PageTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Priority + category colors ---------- */

export const PRIORITY_COLOR: Record<string, string> = {
  critical: "#fb7185",
  high: "#f59e0b",
  medium: "#38bdf8",
  low: "#5d7d99",
};

export const CATEGORY_COLOR: Record<string, string> = {
  College: "#38bdf8",
  DSA: "#00e5ff",
  Internship: "#a78bfa",
  Personal: "#f59e0b",
  Fitness: "#34d399",
};

/* ---------- Relative time (client-side only strings) ---------- */

export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const fmt = (v: number, u: string) => `${v}${u} ${diff >= 0 ? "ago" : ""}`.trim();
  if (abs < 60_000) return diff >= 0 ? "just now" : "in <1m";
  if (abs < 3_600_000) return diff >= 0 ? fmt(Math.round(abs / 60_000), "m") : `in ${Math.round(abs / 60_000)}m`;
  if (abs < 86_400_000) return diff >= 0 ? fmt(Math.round(abs / 3_600_000), "h") : `in ${Math.round(abs / 3_600_000)}h`;
  return diff >= 0 ? fmt(Math.round(abs / 86_400_000), "d") : `in ${Math.round(abs / 86_400_000)}d`;
}

export function dueLabel(iso?: string): { text: string; urgent: boolean } {
  if (!iso) return { text: "—", urgent: false };
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return { text: "overdue", urgent: true };
  if (diff < 86_400_000) return { text: `${Math.max(1, Math.round(diff / 3_600_000))}h left`, urgent: true };
  return { text: `${Math.round(diff / 86_400_000)}d left`, urgent: false };
}
