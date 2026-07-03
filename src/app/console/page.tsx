"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bug, ChevronDown, ChevronRight, FileCode2, FileJson2, FileTerminal, FolderOpen, Folder,
  Loader2, ScanSearch, Sparkles, SquareTerminal, Wand2, Wrench,
} from "lucide-react";
import { GlassCard, PageTransition } from "@/components/ui/primitives";
import CodeBlock from "@/components/console/CodeBlock";
import { sampleProject, sampleSqlError, seedTerminal } from "@/lib/data/seed";
import type { AnalysisResult, FileNode } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Canned analyses — stand-ins for the coding agent's tool pipeline    */
/* ------------------------------------------------------------------ */

const CORRECTED_SQL = `-- corrected: drop the redundant join; the subquery
-- already enforces capacity atomically
INSERT INTO registrations (event_id, user_id, created_at)
SELECT e.id, $2, NOW()
FROM events e
WHERE e.id = $1
  AND e.capacity > (
    SELECT COUNT(*) FROM registrations r
    WHERE r.event_id = e.id
  )
RETURNING id, event_id, user_id;`;

const SQL_ORIGINAL = `INSERT INTO registrations (event_id, user_id, created_at)
SELECT e.id, $2, NOW()
FROM events e
JOIN registrations ON event_id = e.id
WHERE e.id = $1
  AND e.capacity > (
    SELECT COUNT(*) FROM registrations WHERE event_id = e.id
  )
RETURNING id, event_id, user_id;`;

const SQL_DEBUG: AnalysisResult = {
  kind: "debug",
  title: "PostgreSQL: ambiguous column reference",
  rootCause:
    "Line 4 joins registrations without an alias, so “event_id” could belong to either the joined table or the INSERT target — PostgreSQL refuses to guess. The join is also logically wrong: it multiplies rows per existing registration and blocks the very first signup (no rows to join against).",
  steps: [
    "Parsed the stack trace → error originates in register.sql, invoked by routes/events.ts line 12.",
    "Identified the offending clause: JOIN registrations ON event_id = e.id (unqualified column).",
    "Determined the join is redundant — the capacity subquery already counts registrations atomically.",
    "Generated corrected query and verified it against the schema: first-signup case now succeeds.",
  ],
  code: [
    { language: "sql", content: SQL_ORIGINAL, highlightLines: [4], label: "src/register.sql — offending query" },
    { language: "sql", content: CORRECTED_SQL, label: "suggested fix" },
  ],
  confidence: 0.96,
};

const FILE_EXPLAIN: Record<string, string> = {
  "alumni-system/src/routes/events.ts":
    "Express router for the events module. POST /:id/register pulls the event id from the path and userId from the body, then runs REGISTER_QUERY in a single round trip so the capacity check and insert stay atomic. Weakness: the catch block collapses every failure to a 500 — a full-capacity event and a SQL bug look identical to clients. Recommend distinguishing 409 (full) from 500 (fault).",
  "alumni-system/src/routes/users.ts":
    "Minimal read endpoint. Parameterized query prevents injection; returns 404 when no row matches. Clean — no action needed.",
  "alumni-system/src/db.ts":
    "Shared pg connection pool (max 10, 30s idle timeout). The error listener stops a dropped connection from crashing the process. Consider adding statement_timeout to guard against runaway queries.",
  "alumni-system/src/register.sql":
    "Registration insert with an inline capacity guard. Contains the active bug: the JOIN on line 4 is both ambiguous and redundant — run Debug for the full analysis and fix.",
};

/* ------------------------------------------------------------------ */
/* File tree                                                           */
/* ------------------------------------------------------------------ */

function FileIcon({ node }: { node: FileNode }) {
  if (node.language === "json") return <FileJson2 size={13} className="text-amber-300/80" />;
  if (node.language === "sql") return <FileTerminal size={13} className="text-violet-300/80" />;
  return <FileCode2 size={13} className="text-cyan-300/80" />;
}

function Tree({ node, depth, selected, onSelect }: {
  node: FileNode; depth: number; selected: string | null; onSelect: (n: FileNode) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  if (node.type === "dir") {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-dim transition-colors hover:bg-line/30 hover:text-icy"
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {open ? <FolderOpen size={13} className="text-cyan-400/70" /> : <Folder size={13} className="text-cyan-400/70" />}
          {node.name}
        </button>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              {node.children?.map((c) => (
                <Tree key={c.path} node={c} depth={depth + 1} selected={selected} onSelect={onSelect} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
  const active = selected === node.path;
  return (
    <button
      onClick={() => onSelect(node)}
      className={`flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[13px] transition-all ${
        active ? "bg-cyan-400/10 text-cyan-200 shadow-[inset_0_0_10px_rgba(0,229,255,0.06)]" : "text-dim hover:bg-line/30 hover:text-icy"
      }`}
      style={{ paddingLeft: 22 + depth * 14 }}
    >
      <FileIcon node={node} />
      {node.name}
      {node.path.endsWith("register.sql") && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#fb7185]" />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Terminal                                                            */
/* ------------------------------------------------------------------ */

function lineColor(l: string): string {
  if (l.includes("✗") || l.includes("ERROR")) return "text-rose-300";
  if (l.includes("✓")) return "text-emerald-300";
  if (l.startsWith("jarvis@core")) return "text-cyan-300/90";
  return "text-icy/75";
}

function Terminal({ extraLines }: { extraLines: string[] }) {
  const [lines, setLines] = useState<string[]>(seedTerminal);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (extraLines.length) setLines((l) => [...l, ...extraLines]);
  }, [extraLines]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const exec = () => {
    const cmd = input.trim();
    if (!cmd) return;
    setInput("");
    const prompt = `jarvis@core:~/dev/alumni-system$ ${cmd}`;
    if (cmd === "clear") return setLines([]);
    const out: Record<string, string[]> = {
      help: ["  commands: ls · npm run test · cat register.sql · clear · help"],
      ls: ["  src/  .env  package.json  node_modules/"],
      "npm run test": ["  ✓ users.test.ts (6 tests) 398ms", "  ✗ events.test.ts (4 tests | 2 failed) 901ms", "    → POST /register returns 500 — expected 201"],
      "cat register.sql": ["  INSERT INTO registrations … JOIN registrations ON event_id = e.id  ← line 4"],
    };
    setLines((l) => [...l, prompt, ...(out[cmd] ?? [`  jarvis: unknown command “${cmd}” — try help`])]);
  };

  return (
    <div className="flex h-52 shrink-0 flex-col overflow-hidden rounded-xl border border-line/70 bg-void/80">
      <div className="flex items-center gap-2 border-b border-line/60 bg-panel/70 px-3 py-1.5">
        <SquareTerminal size={12} className="text-cyan-400/80" />
        <span className="hud-label !text-[9px]">terminal — alumni-system</span>
        <span className="ml-auto flex gap-1.5">
          {["#fb7185", "#f59e0b", "#34d399"].map((c) => <span key={c} className="h-2 w-2 rounded-full opacity-70" style={{ background: c }} />)}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 font-mono text-[12px] leading-[1.7]">
        {lines.map((l, i) => (
          <div key={i} className={lineColor(l)}>{l}</div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 border-t border-line/60 px-2.5 py-1.5 font-mono text-[12px]">
        <span className="text-cyan-400">❯</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && exec()}
          placeholder="type help…"
          className="flex-1 bg-transparent text-cyan-50 placeholder:text-ghost"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Console screen                                                      */
/* ------------------------------------------------------------------ */

const ACTIONS = [
  { id: "explain", label: "Explain code", icon: Sparkles },
  { id: "debug", label: "Debug error", icon: Bug },
  { id: "logs", label: "Analyze logs", icon: ScanSearch },
  { id: "generate", label: "Generate", icon: Wand2 },
] as const;

export default function ConsoleScreen() {
  const [selected, setSelected] = useState<FileNode | null>(null);
  const [paste, setPaste] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  const [terminalExtra, setTerminalExtra] = useState<string[]>([]);

  const think = (fn: () => void) => {
    setBusy(true);
    setExplanation(null);
    setAnalysis(null);
    setTimeout(() => { fn(); setBusy(false); }, 950);
  };

  const analyze = (payload?: string) => {
    const text = (payload ?? paste).trim();
    if (!text) return;
    think(() => {
      setApplied(false);
      if (/ambiguous|event_id|sql|insert|select/i.test(text)) {
        setAnalysis(SQL_DEBUG);
      } else {
        setAnalysis({
          kind: "logs",
          title: "General analysis",
          rootCause: "No known failure signature matched locally. In production this payload is escalated to the coding agent with repository context and the last 200 log lines attached.",
          steps: ["Normalized the input and extracted candidate stack frames.", "Searched the codebase index for matching symbols.", "No high-confidence match — escalation path prepared."],
          confidence: 0.42,
        });
      }
    });
  };

  const explain = (node: FileNode) => {
    think(() => setExplanation(FILE_EXPLAIN[node.path] ?? "This file is not in the local index yet. The coding agent would chunk, embed, and summarize it on first access."));
  };

  const applyFix = () => {
    setApplied(true);
    setTerminalExtra([
      "jarvis@core:~/dev/alumni-system$ jarvis apply-fix src/register.sql",
      "  ✓ patch applied — removed redundant join, qualified event_id",
      "  ✓ events.test.ts (4 tests) 764ms — all passing",
    ]);
  };

  return (
    <PageTransition className="flex h-full min-h-[560px] gap-4">
      {/* Left — explorer + terminal */}
      <div className="flex w-72 shrink-0 flex-col gap-3">
        <GlassCard hover={false} className="flex min-h-0 flex-1 flex-col p-2.5">
          <div className="hud-label mb-2 px-1.5 !text-cyan-200/70">Project Explorer</div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Tree node={sampleProject} depth={0} selected={selected?.path ?? null} onSelect={(n) => { setSelected(n); setExplanation(null); }} />
          </div>
        </GlassCard>
        <Terminal extraLines={terminalExtra} />
      </div>

      {/* Right — AI analysis panel */}
      <GlassCard hover={false} className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="hud-label !text-cyan-200/70">AI Analysis</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                className="chip"
                onClick={() => {
                  if (a.id === "explain" && selected) explain(selected);
                  else if (a.id === "debug") { setPaste(sampleSqlError); analyze(sampleSqlError); }
                  else if (a.id === "logs") analyze();
                  else if (a.id === "generate") think(() => setExplanation("Generation ready: describe the endpoint, model, or test you need and the coding agent will draft it against this repository's conventions (Express + pg, parameterized queries, vitest)."));
                }}
              >
                <a.icon size={11} /> {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {/* Paste zone */}
          <div className="flex flex-col gap-2">
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={3}
              placeholder="Paste an error, stack trace, or SQL here — or click “Debug error” to load the live failure from the test run…"
              className="w-full resize-none rounded-xl border border-line/70 bg-void/60 p-3 font-mono text-[12.5px] leading-relaxed text-icy transition-all placeholder:text-ghost focus:border-cyan-400/50 focus:shadow-[0_0_18px_rgba(0,229,255,0.08)]"
              spellCheck={false}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => analyze()}
                disabled={busy}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-4 py-1.5 text-[13px] text-cyan-100 transition-all hover:bg-cyan-400/20 hover:shadow-[0_0_16px_rgba(0,229,255,0.3)] disabled:opacity-50"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <ScanSearch size={13} />}
                {busy ? "analyzing…" : "Analyze"}
              </button>
              {selected && (
                <span className="truncate font-mono text-[11.5px] text-ghost">selected: {selected.path}</span>
              )}
            </div>
          </div>

          {busy && (
            <div className="flex items-center gap-3 rounded-xl border border-line/60 bg-panel/50 px-4 py-3 text-[13px] text-dim">
              <span className="shimmer-line h-[3px] w-32 rounded-full" />
              parsing stack trace · matching failure signatures · searching codebase index…
            </div>
          )}

          {/* File explanation */}
          <AnimatePresence>
            {explanation && !busy && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.05] p-4">
                <div className="hud-label mb-1.5 !text-cyan-300/80">Explanation</div>
                <p className="text-[13.5px] leading-relaxed text-cyan-50/90">{explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Selected file source */}
          {selected?.content && !analysis && (
            <CodeBlock code={selected.content} language={selected.language ?? "ts"} title={selected.path} />
          )}

          {/* Analysis result */}
          <AnimatePresence>
            {analysis && !busy && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-display text-[13px] tracking-wider text-cyan-100 uppercase">{analysis.title}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="hud-label !text-[9px]">confidence</span>
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line/50">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${analysis.confidence * 100}%` }} transition={{ duration: 0.8 }} className={`h-full rounded-full ${analysis.confidence > 0.8 ? "bg-emerald-400" : "bg-amber-400"}`} />
                    </div>
                    <span className="font-display text-[11px] text-icy">{Math.round(analysis.confidence * 100)}%</span>
                  </div>
                </div>

                {analysis.rootCause && (
                  <div className="rounded-xl border border-rose-400/30 bg-rose-400/[0.05] p-4">
                    <div className="hud-label mb-1.5 !text-rose-300/90">Root Cause</div>
                    <p className="text-[13.5px] leading-relaxed text-rose-50/90">{analysis.rootCause}</p>
                  </div>
                )}

                <div className="rounded-xl border border-line/60 bg-panel/40 p-4">
                  <div className="hud-label mb-2 !text-cyan-200/70">Reasoning trace</div>
                  <ol className="flex flex-col gap-1.5">
                    {analysis.steps.map((s, i) => (
                      <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }} className="flex gap-2.5 text-[13px] leading-relaxed text-icy/90">
                        <span className="font-display text-[11px] text-cyan-400/80">{String(i + 1).padStart(2, "0")}</span>
                        {s}
                      </motion.li>
                    ))}
                  </ol>
                </div>

                {analysis.code?.map((c) => (
                  <CodeBlock key={c.label} code={c.content} language={c.language} title={c.label} highlightLines={c.highlightLines} />
                ))}

                {analysis.kind === "debug" && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={applyFix}
                      disabled={applied}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-[13px] transition-all ${
                        applied
                          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                          : "border-cyan-400/50 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20 hover:shadow-[0_0_16px_rgba(0,229,255,0.3)]"
                      }`}
                    >
                      <Wrench size={13} /> {applied ? "Fix applied — tests green" : "Apply fix to src/register.sql"}
                    </button>
                    {applied && <span className="text-[12.5px] text-emerald-300/80">Patched and verified in the terminal ↓</span>}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!analysis && !explanation && !busy && !selected && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
              <FileCode2 size={28} className="text-ghost" />
              <p className="max-w-sm text-[13.5px] leading-relaxed text-dim">
                Select a file to inspect it, or click <span className="text-cyan-300">Debug error</span> to replay the live failure:
                the registration endpoint is returning 500 in events.test.ts.
              </p>
            </div>
          )}
        </div>
      </GlassCard>
    </PageTransition>
  );
}
