"use client";

import { useEffect, useState } from "react";

interface Particle {
  left: number;
  top: number;
  size: number;
  dur: number;
  delay: number;
  opacity: number;
}

/** Ambient drifting particles — generated client-side to stay hydration-safe. */
export default function Particles({ count = 34 }: { count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2.4,
        dur: 6 + Math.random() * 9,
        delay: -Math.random() * 10,
        opacity: 0.12 + Math.random() * 0.4,
      })),
    );
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            background: "#7ceeff",
            boxShadow: "0 0 6px rgba(0,229,255,0.8)",
            animation: `float ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
