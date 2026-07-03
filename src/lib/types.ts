/* ---------- Core domain types shared across JARVIS ---------- */

export type CoreState = "idle" | "listening" | "processing" | "responding";

export type Category = "College" | "DSA" | "Internship" | "Personal" | "Fitness";

export type Priority = "critical" | "high" | "medium" | "low";

export type TaskStatus = "backlog" | "progress" | "done";

export interface Task {
  id: string;
  title: string;
  category: Category;
  priority: Priority;
  status: TaskStatus;
  due?: string; // ISO
  recurring?: "daily" | "weekly";
  createdAt: string;
  completedAt?: string;
}

export type MemoryType = "goal" | "preference" | "project" | "deadline" | "note";

export interface MemoryItem {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  tags: string[];
  /** ids of AI-linked memories */
  connections: string[];
  /** 0..1 retrieval strength */
  strength: number;
  updatedAt: string;
}

export interface Milestone {
  label: string;
  at: number; // value of `current` at which milestone completes
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  unit: string;
  current: number;
  target: number;
  /** average progress per week, used for predictive completion */
  weeklyRate: number;
  streakDays: number;
  color: string;
  milestones: Milestone[];
  /** weekly history of `current`, oldest first */
  history: number[];
}

export interface AutomationRun {
  id: string;
  time: string;
  status: "success" | "failed" | "skipped";
  detail: string;
}

export interface Automation {
  id: string;
  name: string;
  icon: string;
  trigger: string;
  schedule: string;
  enabled: boolean;
  lastRun: string;
  successRate: number;
  history: AutomationRun[];
}

export interface AppNotification {
  id: string;
  title: string;
  detail: string;
  time: string;
  kind: "alert" | "info" | "success";
  read: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "jarvis";
  text: string;
  time: string;
}

export interface CommandLogEntry {
  id: string;
  input: string;
  summary: string;
  time: string;
}

/* ---------- Developer console ---------- */

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  language?: "ts" | "sql" | "json" | "env";
  content?: string;
  children?: FileNode[];
}

export interface AnalysisResult {
  kind: "explain" | "debug" | "generate" | "search" | "logs";
  title: string;
  rootCause?: string;
  steps: string[];
  code?: { language: "ts" | "sql"; content: string; highlightLines?: number[]; label: string }[];
  confidence: number;
}

/* ---------- AI engine ---------- */

export interface EngineResult {
  text: string;
  nav?: string;
  suggestions?: string[];
  spoken?: string;
}
