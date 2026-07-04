"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock, Check, FolderKanban, Link2, Pencil, Plus, Search, SlidersHorizontal, StickyNote, Target, Trash2,
} from "lucide-react";
import { GlassCard, PageTransition, relTime } from "@/components/ui/primitives";
import { scoreMemory, useMemoryStore } from "@/lib/store/memory";
import { uid } from "@/lib/data/seed";
import type { MemoryItem, MemoryType } from "@/lib/types";

const TYPE_META: Record<MemoryType, { icon: typeof Target; color: string; label: string }> = {
  goal: { icon: Target, color: "#00e5ff", label: "Goal" },
  preference: { icon: SlidersHorizontal, color: "#f59e0b", label: "Preference" },
  project: { icon: FolderKanban, color: "#a78bfa", label: "Project" },
  deadline: { icon: AlarmClock, color: "#fb7185", label: "Deadline" },
  note: { icon: StickyNote, color: "#34d399", label: "Note" },
};

function MemoryCard({
  memory, all, focused, onFocusConnection,
}: {
  memory: MemoryItem;
  all: MemoryItem[];
  focused: boolean;
  onFocusConnection: (id: string) => void;
}) {
  const { updateMemory, deleteMemory } = useMemoryStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memory.content);
  const meta = TYPE_META[memory.type];
  const Icon = meta.icon;

  return (
    <motion.div
      layout
      id={`mem-${memory.id}`}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1, boxShadow: focused ? `0 0 0 1.5px ${meta.color}99, 0 0 32px ${meta.color}33` : "0 0 0 0px transparent" }}
      exit={{ opacity: 0, scale: 0.9, filter: "blur(6px)" }}
      transition={{ duration: 0.3 }}
      className="glass glass-hover flex flex-col rounded-[14px] p-4"
    >
      <div className="mb-2 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: `${meta.color}55`, background: `${meta.color}12`, color: meta.color }}>
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-cyan-50">{memory.title}</div>
          <div className="hud-label !text-[9px]" style={{ color: meta.color }}>{meta.label}</div>
        </div>
        <div className="flex gap-1">
          {editing ? (
            <button
              onClick={() => { updateMemory(memory.id, draft); setEditing(false); }}
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10"
            >
              <Check size={13} />
            </button>
          ) : (
            <button onClick={() => { setDraft(memory.content); setEditing(true); }} className="grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-line text-ghost hover:border-cyan-400/40 hover:text-cyan-300">
              <Pencil size={12} />
            </button>
          )}
          <button onClick={() => deleteMemory(memory.id)} className="grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-line text-ghost hover:border-rose-400/40 hover:text-rose-300">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          autoFocus
          className="mb-2 w-full resize-none rounded-lg border border-cyan-400/40 bg-void/60 p-2.5 text-[13.5px] leading-relaxed text-icy"
        />
      ) : (
        <p className="mb-3 flex-1 text-[13.5px] leading-relaxed text-icy/85">{memory.content}</p>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {memory.tags.map((t) => (
          <span key={t} className="rounded-md bg-line/40 px-1.5 py-0.5 text-[11px] tracking-wide text-dim">#{t}</span>
        ))}
      </div>

      {memory.connections.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Link2 size={11} className="text-cyan-400/60" />
          {memory.connections.map((cid) => {
            const target = all.find((m) => m.id === cid);
            if (!target) return null;
            return (
              <button key={cid} className="chip !py-0.5 !text-[11px]" onClick={() => onFocusConnection(cid)}>
                {target.title}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-auto flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-line/50">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${memory.strength * 100}%` }}
            transition={{ duration: 1 }}
            className="h-full rounded-full"
            style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
          />
        </div>
        <span className="text-[10.5px] whitespace-nowrap text-ghost">
          {Math.round(memory.strength * 100)}% recall · {relTime(memory.updatedAt)}
        </span>
      </div>
    </motion.div>
  );
}

export default function MemoryScreen() {
  const { memories, query, typeFilter, setQuery, setTypeFilter, addMemory } = useMemoryStore();
  const [focusId, setFocusId] = useState<string | null>(null);

  const results = useMemo(() => {
    return memories
      .map((m) => ({ m, score: scoreMemory(m, query) }))
      .filter(({ m, score }) => score > 0.3 && (typeFilter === "all" || m.type === typeFilter))
      .sort((a, b) => b.score - a.score || b.m.strength - a.m.strength)
      .map(({ m }) => m);
  }, [memories, query, typeFilter]);

  const focusConnection = (id: string) => {
    setFocusId(id);
    document.getElementById(`mem-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setFocusId(null), 2200);
  };

  return (
    <PageTransition className="mx-auto flex max-w-6xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[18px] tracking-[0.22em] text-cyan-50 uppercase" style={{ textShadow: "0 0 18px rgba(0,229,255,0.35)" }}>
            Memory Engine
          </h1>
          <p className="mt-1 text-[13px] text-dim">{memories.length} memories indexed · vector store synced · connections rebuilt nightly</p>
        </div>
        <button
          onClick={() => addMemory({ id: uid(), type: "note", title: "New memory", content: "Describe what SHAFFA should remember…", tags: ["new"], connections: [], strength: 0.5, updatedAt: new Date().toISOString() })}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-3.5 py-2 text-[13px] text-cyan-100 transition-all hover:bg-cyan-400/20 hover:shadow-[0_0_16px_rgba(0,229,255,0.3)]"
        >
          <Plus size={14} /> Add memory
        </button>
      </header>

      <GlassCard hover={false} className="flex flex-wrap items-center gap-3 p-3">
        <div className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border border-line/70 bg-void/50 px-3 py-2 transition-all focus-within:border-cyan-400/50 focus-within:shadow-[0_0_16px_rgba(0,229,255,0.1)]">
          <Search size={14} className="text-cyan-400/70" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Semantic search — try “focus time”, “placement”, “alumni”…"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-cyan-50 placeholder:text-ghost"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button className="chip" data-active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>all</button>
          {(Object.keys(TYPE_META) as MemoryType[]).map((t) => (
            <button key={t} className="chip" data-active={typeFilter === t} onClick={() => setTypeFilter(t)}>
              {TYPE_META[t].label.toLowerCase()}s
            </button>
          ))}
        </div>
      </GlassCard>

      <motion.div layout className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {results.map((m) => (
            <MemoryCard key={m.id} memory={m} all={memories} focused={focusId === m.id} onFocusConnection={focusConnection} />
          ))}
        </AnimatePresence>
      </motion.div>
      {results.length === 0 && (
        <div className="py-16 text-center text-dim">No memories match that query. The engine would fall back to fuzzy vector search in production.</div>
      )}
    </PageTransition>
  );
}
