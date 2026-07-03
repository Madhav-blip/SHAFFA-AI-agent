import { create } from "zustand";
import type { MemoryItem, MemoryType } from "@/lib/types";
import { seedMemories } from "@/lib/data/seed";

interface MemoryState {
  memories: MemoryItem[];
  query: string;
  typeFilter: MemoryType | "all";
  addMemory: (m: MemoryItem) => void;
  updateMemory: (id: string, content: string) => void;
  deleteMemory: (id: string) => void;
  setQuery: (q: string) => void;
  setTypeFilter: (t: MemoryType | "all") => void;
}

export const useMemoryStore = create<MemoryState>((set) => ({
  memories: seedMemories,
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
  setQuery: (query) => set({ query }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
}));

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
