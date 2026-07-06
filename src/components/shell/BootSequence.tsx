"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const BOOT_LINES = [
  "memory engine · mounted",
  "task grid · synchronized",
  "voice pipeline · armed",
  "automation runner · watching",
  "cloud reasoning · linked",
];

/**
 * Cinematic boot overlay. Full sequence (~1.9s) on the first load of a
 * session; a quick flash (~0.7s) on every load after that — wow once,
 * fast always.
 */
export default function BootSequence({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true);
  // Mounted client-side only (behind AppShell's gate), so sessionStorage is safe.
  const [quick] = useState(() => sessionStorage.getItem("shaffa-booted") === "1");

  useEffect(() => {
    const t = setTimeout(() => {
      sessionStorage.setItem("shaffa-booted", "1");
      setVisible(false);
      setTimeout(onDone, 300);
    }, quick ? 700 : 1900);
    return () => clearTimeout(t);
  }, [onDone, quick]);

  const k = quick ? 0.32 : 1; // time-scale for inner animations

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="boot"
          exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-void"
        >
          {/* Reactor ring drawing itself in */}
          <div className="relative h-32 w-32">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 text-cyan-300">
              <motion.circle
                cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="1.6"
                strokeDasharray="1" strokeLinecap="round" pathLength="1"
                initial={{ strokeDashoffset: 1 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.1 * k, ease: [0.65, 0, 0.35, 1] }}
                style={{ filter: "drop-shadow(0 0 8px rgba(0,229,255,0.8))" }}
              />
              <motion.circle
                cx="50" cy="50" r="33" fill="none" stroke="currentColor" strokeWidth="0.8"
                strokeDasharray="4 5" opacity="0.6" pathLength="1"
                initial={{ strokeDashoffset: 1 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.4 * k, delay: 0.15 * k, ease: "easeOut" }}
              />
            </svg>
            <motion.div
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: [0.3, 1.15, 1] }}
              transition={{ delay: 0.7 * k, duration: 0.55 * k, ease: "easeOut" }}
              className="absolute inset-[38px] rounded-full bg-[radial-gradient(circle_at_40%_35%,rgba(0,229,255,0.95),rgba(4,10,18,0.9)_75%)] shadow-[0_0_34px_rgba(0,229,255,0.6)]"
            />
          </div>

          {/* Name — letters materialize */}
          <div className="mt-7 flex gap-[0.3em] font-display text-[24px] tracking-[0.34em] text-cyan-100">
            {"S.H.A.F.F.A".split("").map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: (0.4 + i * 0.05) * k, duration: 0.35 * k }}
                style={{ textShadow: "0 0 22px rgba(0,229,255,0.55)" }}
              >
                {ch}
              </motion.span>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 * k }}
            className="hud-label mt-2"
          >
            Personal AI Operating System
          </motion.div>

          {/* Subsystem checks — full boot only */}
          {!quick && (
            <div className="mt-6 flex h-5 flex-col items-center overflow-hidden">
              {BOOT_LINES.map((line, i) => (
                <motion.span
                  key={line}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ delay: 0.25 + i * 0.33, duration: 0.4, times: [0, 0.25, 0.8, 1] }}
                  className="absolute font-mono text-[11px] tracking-[0.18em] text-cyan-400/80 uppercase"
                >
                  {line}
                </motion.span>
              ))}
            </div>
          )}

          {/* Progress */}
          <div className="mt-4 h-[3px] w-56 overflow-hidden rounded-full bg-line/50">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: (quick ? 0.6 : 1.7), ease: [0.3, 0.6, 0.4, 1] }}
              className="h-full origin-left rounded-full bg-gradient-to-r from-cyan-500 to-cyan-200"
              style={{ boxShadow: "0 0 12px rgba(0,229,255,0.7)" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
