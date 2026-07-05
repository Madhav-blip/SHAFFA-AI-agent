"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { useEffect, useId, useState, type ReactNode } from "react";

/* ---------- Animated counter ---------- */

export function CountUp({
  value,
  className = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  className?: string;
  suffix?: string;
  decimals?: number;
}) {
  const mv = useMotionValue(0);
  const [text, setText] = useState("0");
  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setText(v.toFixed(decimals)),
    });
    return () => controls.stop();
  }, [value, decimals, mv]);
  return (
    <span className={className}>
      {text}
      {suffix}
    </span>
  );
}

/* ---------- Progress ring ---------- */

export function ProgressRing({
  value,
  size = 110,
  stroke = 7,
  color = "#00e5ff",
  track = "rgba(36,71,106,0.35)",
  children,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.min(1, Math.max(0, value))) }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ---------- Sparkline ---------- */

export function Sparkline({
  data,
  width = 130,
  height = 38,
  color = "#00e5ff",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const id = useId();
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - 3 - ((v - min) / span) * (height - 8),
  ]);
  const line = pts.map((p) => p.join(",")).join(" ");
  const area = `${pts.map((p) => p.join(",")).join(" ")} ${width},${height} 0,${height}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
      />
    </svg>
  );
}

/* ---------- Area chart ---------- */

export function AreaChart({
  data,
  color = "#00e5ff",
  height = 190,
  yLabel,
}: {
  data: number[];
  color?: string;
  height?: number;
  yLabel?: string;
}) {
  const id = useId();
  const W = 620;
  const H = height;
  const pad = 26;
  const max = Math.max(...data) * 1.15;
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (W - pad * 2),
    H - pad - (v / max) * (H - pad * 2),
  ]);
  const line = pts.map((p) => p.join(",")).join(" ");
  const area = `${line} ${pts[pts.length - 1][0]},${H - pad} ${pts[0][0]},${H - pad}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={pad}
          x2={W - pad}
          y1={H - pad - f * (H - pad * 2)}
          y2={H - pad - f * (H - pad * 2)}
          stroke="rgba(36,71,106,0.3)"
          strokeDasharray="3 5"
        />
      ))}
      <polygon points={area} fill={`url(#${id})`} />
      <motion.polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 5px ${color}77)` }}
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="2.4" fill={color} opacity={i === pts.length - 1 ? 1 : 0.45} />
      ))}
      {yLabel ? (
        <text x={pad} y={14} fill="#5d7d99" fontSize="11" letterSpacing="2">
          {yLabel}
        </text>
      ) : null}
    </svg>
  );
}

/* ---------- Bar chart ---------- */

export function BarChart({
  data,
  color = "#00e5ff",
  height = 190,
  unit = "",
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  unit?: string;
}) {
  const id = useId();
  const W = 620;
  const H = height;
  const pad = 26;
  const max = Math.max(...data.map((d) => d.value)) * 1.2;
  const bw = (W - pad * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const h = (d.value / max) * (H - pad * 2);
        const x = pad + i * bw + bw * 0.22;
        return (
          <g key={d.label} className="group">
            <motion.rect
              x={x}
              width={bw * 0.56}
              rx={4}
              initial={{ y: H - pad, height: 0 }}
              animate={{ y: H - pad - h, height: h }}
              transition={{ duration: 0.9, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              fill={`url(#${id})`}
              stroke={`${color}44`}
            />
            <text x={x + bw * 0.28} y={H - pad + 16} textAnchor="middle" fill="#5d7d99" fontSize="11">
              {d.label}
            </text>
            <text x={x + bw * 0.28} y={H - pad - h - 7} textAnchor="middle" fill={color} fontSize="11" opacity="0.85">
              {d.value}
              {unit}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- Consistency heatmap ---------- */

export function Heatmap({ grid, color = "0,229,255" }: { grid: number[][]; color?: string }) {
  return (
    <div className="flex gap-[5px]">
      {grid.map((week, w) => (
        <div key={w} className="flex flex-col gap-[5px]">
          {week.map((v, d) => (
            <motion.div
              key={d}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (w * 7 + d) * 0.006 }}
              className="h-[13px] w-[13px] rounded-[3px]"
              style={{
                background: v === 0 ? "rgba(36,71,106,0.25)" : `rgba(${color},${0.16 + v * 0.2})`,
                boxShadow: v >= 3 ? `0 0 6px rgba(${color},0.4)` : undefined,
              }}
              title={`Intensity ${v}/4`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------- Segmented donut ---------- */

export function Donut({
  segments,
  size = 150,
  stroke = 16,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let acc = 0;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(36,71,106,0.3)" strokeWidth={stroke} />
      {segments.map((s) => {
        const frac = s.value / total;
        const offset = c * (1 - acc);
        acc += frac;
        return (
          <motion.circle
            key={s.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke - 4}
            strokeDasharray={`${c * frac - 3} ${c - c * frac + 3}`}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 4px ${s.color}55)` }}
          />
        );
      })}
    </svg>
  );
}
