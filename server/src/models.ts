import { Schema, model } from "mongoose";

/* Mongo schemas mirror the frontend types in src/lib/types.ts */

export const Task = model(
  "Task",
  new Schema(
    {
      title: { type: String, required: true },
      category: { type: String, enum: ["College", "DSA", "Internship", "Personal", "Fitness"], index: true },
      priority: { type: String, enum: ["critical", "high", "medium", "low"], default: "medium" },
      status: { type: String, enum: ["backlog", "progress", "done"], default: "backlog", index: true },
      due: Date,
      recurring: { type: String, enum: ["daily", "weekly", null], default: null },
      completedAt: Date,
    },
    { timestamps: true },
  ),
);

export const Memory = model(
  "Memory",
  new Schema(
    {
      type: { type: String, enum: ["goal", "preference", "project", "deadline", "note"], index: true },
      title: String,
      content: { type: String, required: true },
      tags: [String],
      connections: [{ type: Schema.Types.ObjectId, ref: "Memory" }],
      /** embedding vector for semantic retrieval (Atlas Vector Search index: "memory_vector") */
      embedding: { type: [Number], select: false },
      strength: { type: Number, default: 0.5 },
      lastAccessed: Date,
    },
    { timestamps: true },
  ),
);

export const Goal = model(
  "Goal",
  new Schema(
    {
      title: String,
      unit: String,
      current: Number,
      target: Number,
      weeklyRate: Number,
      streakDays: Number,
      milestones: [{ label: String, at: Number, done: Boolean }],
      history: [Number],
    },
    { timestamps: true },
  ),
);

export const Automation = model(
  "Automation",
  new Schema(
    {
      name: String,
      trigger: String,
      schedule: String,
      enabled: { type: Boolean, default: true },
      lastRun: Date,
      history: [{ time: Date, status: String, detail: String }],
    },
    { timestamps: true },
  ),
);

export const CommandLog = model(
  "CommandLog",
  new Schema(
    {
      input: String,
      intent: String,
      toolCalls: [{ name: String, args: Schema.Types.Mixed, ok: Boolean }],
      response: String,
      latencyMs: Number,
    },
    { timestamps: true },
  ),
);
