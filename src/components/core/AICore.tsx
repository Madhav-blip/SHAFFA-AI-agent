"use client";

import { motion } from "framer-motion";
import type { CoreState } from "@/lib/types";

const STATE_COLOR: Record<CoreState, string> = {
  idle: "#22d3ee",
  listening: "#2ee8b8",
  processing: "#b48cff",
  responding: "#00e5ff",
};

/**
 * The animated AI core.
 *  idle       → soft pulse
 *  listening  → expanding rings
 *  processing → fast rotating segments
 *  responding → equalizer wave inside the orb
 */
export default function AICore({ state, size = 280 }: { state: CoreState; size?: number }) {
  const color = STATE_COLOR[state];
  const u = size / 100; // scale unit

  return (
    <div
      className="relative select-none transition-colors duration-700"
      style={{ width: size, height: size, color }}
    >
      {/* Expanding rings — listening */}
      {state === "listening" &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-ring-ping absolute inset-0 rounded-full border"
            style={{ borderColor: `${color}66`, animationDelay: `${i * 0.55}s` }}
          />
        ))}

      {/* Outer dashed ring */}
      <svg viewBox="0 0 100 100" className={`absolute inset-0 ${state === "processing" ? "animate-spin-med" : "animate-spin-slow"}`}>
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 6" opacity="0.4" />
      </svg>

      {/* Segment ring — rotates faster while processing */}
      <svg viewBox="0 0 100 100" className={`absolute inset-0 ${state === "processing" ? "animate-spin-fast" : "animate-spin-med"}`}>
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="22 12 8 12" strokeLinecap="round" opacity="0.75" style={{ filter: `drop-shadow(0 0 ${3 * u}px ${color}aa)` }} />
      </svg>

      {/* Counter-rotating thin ring */}
      <svg viewBox="0 0 100 100" className="animate-spin-rev absolute inset-0">
        <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="0.7" strokeDasharray="60 30 10 30" opacity="0.5" />
      </svg>

      {/* Tick ring */}
      <svg viewBox="0 0 100 100" className="absolute inset-0">
        <circle cx="50" cy="50" r="31" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="0.6 3.2" opacity="0.35" />
      </svg>

      {/* Core orb */}
      <div
        className={`absolute rounded-full ${state === "processing" ? "animate-core-fast" : "animate-core-pulse"}`}
        style={{
          inset: size * 0.26,
          background: `radial-gradient(circle at 38% 32%, ${color}ee 0%, ${color}55 34%, rgba(4,10,18,0.9) 78%)`,
          boxShadow: `0 0 ${18 * u}px ${color}55, 0 0 ${48 * u}px ${color}22, inset 0 0 ${16 * u}px ${color}44`,
          border: `1px solid ${color}66`,
        }}
      >
        <div className="flex h-full w-full items-center justify-center">
          {state === "responding" ? (
            <div className="flex items-end gap-[9%]" style={{ height: "34%" }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="animate-eq w-[8%] min-w-[3px] origin-bottom rounded-full"
                  style={{
                    height: "100%",
                    background: "#eaffff",
                    boxShadow: `0 0 8px ${color}`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <motion.div
              animate={{ opacity: state === "processing" ? [0.5, 1, 0.5] : 1 }}
              transition={{ repeat: state === "processing" ? Infinity : 0, duration: 0.8 }}
              className="rounded-full"
              style={{
                width: "18%",
                height: "18%",
                background: "#eaffff",
                boxShadow: `0 0 ${10 * u}px #eaffff, 0 0 ${22 * u}px ${color}`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
