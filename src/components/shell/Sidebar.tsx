"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, Brain, LayoutDashboard, ListChecks, Target, Terminal, Zap } from "lucide-react";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/console", label: "Dev Console", icon: Terminal },
  { href: "/automation", label: "Automation", icon: Zap },
  { href: "/analytics", label: "Analytics", icon: Activity },
];

function Meter({ label, base }: { label: string; base: number }) {
  const [v, setV] = useState(base);
  useEffect(() => {
    const t = setInterval(() => setV(Math.min(96, Math.max(8, base + (Math.random() - 0.5) * 22))), 1800);
    return () => clearInterval(t);
  }, [base]);
  return (
    <div className="hidden lg:block">
      <div className="mb-1 flex justify-between text-[10px] tracking-widest text-ghost">
        <span>{label}</span>
        <span className="text-dim">{Math.round(v)}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-line/60">
        <motion.div
          animate={{ width: `${v}%` }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          className="h-full rounded-full bg-gradient-to-r from-cyan-500/70 to-cyan-300"
          style={{ boxShadow: "0 0 8px rgba(0,229,255,0.5)" }}
        />
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="z-30 flex w-16 shrink-0 flex-col border-r border-line/70 bg-abyss/60 py-4 backdrop-blur-xl lg:w-56">
      <nav className="flex flex-1 flex-col gap-1 px-2.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className="group relative">
              {active && (
                <motion.div
                  layoutId="nav-active"
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  className="absolute inset-0 rounded-lg border border-cyan-400/40 bg-cyan-400/10"
                  style={{ boxShadow: "0 0 18px rgba(0,229,255,0.12), inset 0 0 12px rgba(0,229,255,0.06)" }}
                />
              )}
              <div
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200 ${
                  active ? "text-cyan-200" : "text-dim group-hover:text-cyan-200/80"
                }`}
              >
                <Icon size={17} className={active ? "drop-shadow-[0_0_6px_rgba(0,229,255,0.8)]" : ""} />
                <span className="hidden font-display text-[11.5px] tracking-[0.18em] uppercase lg:inline">{label}</span>
                {active && <span className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-r bg-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.9)]" />}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 flex flex-col gap-3 border-t border-line/60 pt-4">
        <Meter label="CORE" base={34} />
        <Meter label="MEMORY" base={58} />
        <Meter label="AGENTS" base={22} />
        <div className="hud-label hidden text-center !text-[9px] lg:block">SHAFFA CORE v4.2.1</div>
      </div>
    </aside>
  );
}
