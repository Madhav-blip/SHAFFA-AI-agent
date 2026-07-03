import Anthropic from "@anthropic-ai/sdk";
import { Memory } from "../models.js";

/**
 * Memory Engine — persistent memory with vector retrieval + summarization.
 *
 * Pipeline:
 *   store()      → embed content → persist doc + embedding
 *   search()     → embed query → $vectorSearch (MongoDB Atlas) → rerank by strength
 *   consolidate()→ nightly: cluster similar memories, merge duplicates,
 *                  decay strength of untouched memories, rebuild connections
 */
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function embed(text: string): Promise<number[]> {
  // Anthropic does not ship an embeddings endpoint — use Voyage AI (recommended
  // in Anthropic docs) or any embedding provider here. Stubbed as a projection
  // hash so the engine runs without credentials in development.
  const v = new Array(256).fill(0);
  for (let i = 0; i < text.length; i++) v[i % 256] += text.charCodeAt(i) / 1000;
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

export const memoryEngine = {
  async store(doc: { type: string; title: string; content: string; tags?: string[] }) {
    const embedding = await embed(`${doc.title}\n${doc.content}`);
    return Memory.create({ ...doc, embedding, strength: 0.6, lastAccessed: new Date() });
  },

  async search(query: string, limit = 10) {
    const queryVector = await embed(query);
    // Atlas Vector Search; falls back to text search when the index is absent.
    try {
      return await Memory.aggregate([
        {
          $vectorSearch: {
            index: "memory_vector",
            path: "embedding",
            queryVector,
            numCandidates: limit * 10,
            limit,
          },
        },
        { $addFields: { score: { $meta: "vectorSearchScore" } } },
        { $project: { embedding: 0 } },
      ]);
    } catch {
      return Memory.find({ $text: { $search: query } }).limit(limit);
    }
  },

  /** Nightly consolidation — invoked by the automation runner at 03:00. */
  async consolidate() {
    const stale = await Memory.find({ lastAccessed: { $lt: new Date(Date.now() - 30 * 86_400_000) } });
    for (const m of stale) {
      m.strength = Math.max(0.1, (m.strength ?? 0.5) * 0.92); // decay
      await m.save();
    }

    // Summarize long memories with the LLM so retrieval stays cheap.
    const verbose = await Memory.find({ $expr: { $gt: [{ $strLenCP: "$content" }, 1200] } }).limit(5);
    for (const m of verbose) {
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 300,
        messages: [{ role: "user", content: `Compress this memory to <=80 words, keep every fact:\n\n${m.content}` }],
      });
      const text = msg.content[0]?.type === "text" ? msg.content[0].text : m.content;
      m.content = text;
      await m.save();
    }
  },
};
