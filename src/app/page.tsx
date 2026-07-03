"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AICore from "@/components/core/AICore";
import FocusTimer from "@/components/dashboard/FocusTimer";
import {
  DailyInsights,
  ProductivityScore,
  RecentCommands,
  TodayOverview,
  UpcomingDeadlines,
} from "@/components/dashboard/widgets";
import { PageTransition } from "@/components/ui/primitives";
import { useJarvisStore } from "@/lib/store/jarvis";
import { useTaskStore } from "@/lib/store/tasks";
import { useGoalStore } from "@/lib/store/goals";

function greeting(h: number): string {
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const coreState = useJarvisStore((s) => s.coreState);
  const tasks = useTaskStore((s) => s.tasks);
  const goals = useGoalStore((s) => s.goals);
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => setHour(new Date().getHours()), []);

  const open = tasks.filter((t) => t.status !== "done").length;
  const lc = goals.find((g) => g.id === "g1");

  return (
    <PageTransition className="mx-auto flex max-w-6xl flex-col gap-5">
      {/* Hero — the core */}
      <section className="relative flex flex-col items-center pt-2 pb-1">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <AICore state={coreState} size={230} />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 font-display text-[19px] tracking-[0.24em] text-cyan-50 uppercase"
          style={{ textShadow: "0 0 22px rgba(0,229,255,0.4)" }}
        >
          {hour === null ? " " : `${greeting(hour)}, Madhav`}
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-1.5 text-[14px] text-dim">
          {open} open tasks · LeetCode {lc?.current}/{lc?.target} · Alumni System demo is the priority — say the word and we begin.
        </motion.p>
      </section>

      {/* Widget grid */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <TodayOverview />
        <UpcomingDeadlines />
        <FocusTimer />
        <ProductivityScore />
        <RecentCommands />
        <DailyInsights />
      </section>
    </PageTransition>
  );
}
