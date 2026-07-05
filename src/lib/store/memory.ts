import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MemoryItem, MemoryType } from "@/lib/types";
import { uid } from "@/lib/data/seed";

interface MemoryState {
  memories: MemoryItem[];
  query: string;
  typeFilter: MemoryType | "all";
  addMemory: (m: MemoryItem) => void;
  updateMemory: (id: string, content: string) => void;
  deleteMemory: (id: string) => void;
  importText: (raw: string, tag: string) => number;
  setQuery: (q: string) => void;
  setTypeFilter: (t: MemoryType | "all") => void;
}

/** Guess a memory type from imported content. */
function guessType(line: string): MemoryType {
  const l = line.toLowerCase();
  if (/goal|target|aim|want to|plan to/.test(l)) return "goal";
  if (/prefer|like|dislike|style|usually|always|never/.test(l)) return "preference";
  if (/project|building|working on|repo|app/.test(l)) return "project";
  if (/deadline|due|exam|by \d|before /.test(l)) return "deadline";
  return "note";
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set) => ({
      memories: [],
      query: "",
      typeFilter: "all",
      addMemory: (m) => set((s) => ({ memories: [m, ...s.memories] })),
      updateMemory: (id, content) =>
        set((s) => ({
          memories: s.memories.map((m) =>
            m.id === id ? { ...m, content, updatedAt: new Date().toISOString() } : m,
          ),
        })),
      deleteMemory: (id) =>
        set((s) => ({
          memories: s.memories
            .filter((m) => m.id !== id)
            .map((m) => ({ ...m, connections: m.connections.filter((c) => c !== id) })),
        })),
      /** Split pasted text (e.g. Claude's memory of you) into memory cards. */
      importText: (raw, tag) => {
        const lines = raw
          .split(/\n+/)
          .map((l) => l.replace(/^[\s•*\-–\d.)]+/, "").trim())
          .filter((l) => l.length >= 8);
        const items: MemoryItem[] = lines.map((content) => ({
          id: uid(),
          type: guessType(content),
          title: content.slice(0, 42) + (content.length > 42 ? "…" : ""),
          content,
          tags: [tag],
          connections: [],
          strength: 0.7,
          updatedAt: new Date().toISOString(),
        }));
        set((s) => ({ memories: [...items, ...s.memories] }));
        return items.length;
      },
      setQuery: (query) => set({ query }),
      setTypeFilter: (typeFilter) => set({ typeFilter }),
    }),
    { name: "shaffa-memory", partialize: (s) => ({ memories: s.memories }) },
  ),
);

/**
 * Lightweight semantic-ish scoring: token overlap on content + tags + title.
 * Stand-in for the vector search that lives in server/services/memoryEngine.
 */
export function scoreMemory(m: MemoryItem, query: string): number {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (q.length === 0) return 1;
  const hay = `${m.title} ${m.content} ${m.tags.join(" ")}`.toLowerCase();
  let score = 0;
  for (const token of q) {
    if (hay.includes(token)) score += 1;
    else if (token.length > 4 && hay.includes(token.slice(0, Math.ceil(token.length * 0.6)))) score += 0.5;
  }
  return score / q.length;
}
