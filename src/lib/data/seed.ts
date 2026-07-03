import type {
  Task,
  MemoryItem,
  Goal,
  Automation,
  AppNotification,
  CommandLogEntry,
  FileNode,
} from "@/lib/types";

/** ISO string n days from now (negative = past) */
export const daysFromNow = (n: number, hours = 0): string =>
  new Date(Date.now() + n * 86_400_000 + hours * 3_600_000).toISOString();

export const uid = (): string => Math.random().toString(36).slice(2, 10);

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

export const seedTasks: Task[] = [
  { id: "t1", title: "Finish DBMS assignment — normalization exercises", category: "College", priority: "high", status: "progress", due: daysFromNow(1), createdAt: daysFromNow(-3) },
  { id: "t2", title: "LeetCode daily — sliding window set (3 problems)", category: "DSA", priority: "critical", status: "backlog", due: daysFromNow(0, 6), recurring: "daily", createdAt: daysFromNow(-30) },
  { id: "t3", title: "Alumni System — fix event registration API", category: "Internship", priority: "critical", status: "progress", due: daysFromNow(2), createdAt: daysFromNow(-2) },
  { id: "t4", title: "Revise graphs: Dijkstra + Union-Find", category: "DSA", priority: "high", status: "backlog", due: daysFromNow(3), createdAt: daysFromNow(-1) },
  { id: "t5", title: "Draft internship applications — 4 companies", category: "Internship", priority: "high", status: "backlog", due: daysFromNow(4), createdAt: daysFromNow(-5) },
  { id: "t6", title: "Gym — push day + 20 min cardio", category: "Fitness", priority: "medium", status: "backlog", due: daysFromNow(0, 12), recurring: "daily", createdAt: daysFromNow(-60) },
  { id: "t7", title: "OS lab record submission", category: "College", priority: "medium", status: "done", due: daysFromNow(-1), createdAt: daysFromNow(-6), completedAt: daysFromNow(-1) },
  { id: "t8", title: "AWS SAA — 2 practice exams, review IAM section", category: "Personal", priority: "medium", status: "progress", due: daysFromNow(5), createdAt: daysFromNow(-4) },
  { id: "t9", title: "Update resume with Alumni System metrics", category: "Internship", priority: "high", status: "done", createdAt: daysFromNow(-8), completedAt: daysFromNow(-2) },
  { id: "t10", title: "Weekly review + plan next sprint", category: "Personal", priority: "low", status: "backlog", due: daysFromNow(2), recurring: "weekly", createdAt: daysFromNow(-14) },
  { id: "t11", title: "Meal prep for the week", category: "Fitness", priority: "low", status: "done", createdAt: daysFromNow(-2), completedAt: daysFromNow(-1) },
  { id: "t12", title: "Mock interview with peer group", category: "Internship", priority: "medium", status: "backlog", due: daysFromNow(6), createdAt: daysFromNow(-1) },
];

/* ------------------------------------------------------------------ */
/* Memory                                                              */
/* ------------------------------------------------------------------ */

export const seedMemories: MemoryItem[] = [
  { id: "m1", type: "goal", title: "Placement target", content: "Primary objective: secure a 20+ LPA placement offer by end of final year. Prioritize product-based companies; backup plan is high-growth startups.", tags: ["placement", "career"], connections: ["m2", "m4", "m7"], strength: 0.97, updatedAt: daysFromNow(-2) },
  { id: "m2", type: "project", title: "Alumni System", content: "Full-stack alumni management platform (Next.js + Express + PostgreSQL). Owner of the events module. Demo scheduled with the placement cell.", tags: ["internship", "next.js", "postgres"], connections: ["m1", "m8"], strength: 0.91, updatedAt: daysFromNow(-1) },
  { id: "m3", type: "preference", title: "Peak focus window", content: "Best deep-work window is 21:00 – 01:00. Schedule DSA and hard coding work at night; keep mornings for classes and light review.", tags: ["focus", "schedule"], connections: ["m6"], strength: 0.88, updatedAt: daysFromNow(-10) },
  { id: "m4", type: "goal", title: "LeetCode 300", content: "Solve 300 curated problems before placement season. Current pace target: 10 problems/week with weekly pattern revision.", tags: ["dsa", "leetcode"], connections: ["m1", "m6"], strength: 0.94, updatedAt: daysFromNow(-1) },
  { id: "m5", type: "deadline", title: "AWS SAA exam", content: "AWS Solutions Architect Associate exam booked. Weakest areas: VPC peering, cost optimization scenarios.", tags: ["aws", "certification"], connections: ["m1"], strength: 0.8, updatedAt: daysFromNow(-3) },
  { id: "m6", type: "preference", title: "Study style", content: "Learns fastest by building. Prefers 50-minute focus blocks with 10-minute breaks. Music: instrumental only during coding.", tags: ["learning", "focus"], connections: ["m3"], strength: 0.76, updatedAt: daysFromNow(-20) },
  { id: "m7", type: "note", title: "Referral contacts", content: "Seniors at Amazon (Ravi), Flipkart (Sneha), and Zomato (Arjun) agreed to refer once resume is updated with internship metrics.", tags: ["network", "referrals"], connections: ["m1"], strength: 0.72, updatedAt: daysFromNow(-6) },
  { id: "m8", type: "deadline", title: "Alumni System demo", content: "Demo of the events module to the placement cell. Must fix the registration API bug and prepare a 5-minute walkthrough.", tags: ["internship", "demo"], connections: ["m2"], strength: 0.9, updatedAt: daysFromNow(-1) },
  { id: "m9", type: "note", title: "Health guardrail", content: "Productivity measurably drops after 01:30. Hard stop at 01:00 on weekdays; minimum 6.5 hours of sleep.", tags: ["health", "sleep"], connections: ["m3"], strength: 0.68, updatedAt: daysFromNow(-12) },
  { id: "m10", type: "preference", title: "Communication style", content: "Prefers concise, direct answers with code examples first and theory second. Dislikes long unstructured explanations.", tags: ["style"], connections: [], strength: 0.83, updatedAt: daysFromNow(-30) },
];

/* ------------------------------------------------------------------ */
/* Goals                                                               */
/* ------------------------------------------------------------------ */

export const seedGoals: Goal[] = [
  {
    id: "g1", title: "LeetCode Grind", unit: "problems", current: 124, target: 300, weeklyRate: 9, streakDays: 0, color: "#00e5ff",
    milestones: [
      { label: "Arrays + Strings", at: 60, done: true },
      { label: "Trees + Graphs", at: 140, done: false },
      { label: "DP mastery", at: 220, done: false },
      { label: "Contest ready", at: 300, done: false },
    ],
    history: [58, 71, 83, 96, 104, 113, 124],
  },
  {
    id: "g2", title: "AWS Certification", unit: "%", current: 60, target: 100, weeklyRate: 7, streakDays: 5, color: "#f59e0b",
    milestones: [
      { label: "Core services", at: 30, done: true },
      { label: "Networking + IAM", at: 55, done: true },
      { label: "Practice exams", at: 85, done: false },
      { label: "Certified", at: 100, done: false },
    ],
    history: [18, 26, 34, 41, 49, 55, 60],
  },
  {
    id: "g3", title: "Internship Applications", unit: "applications", current: 12, target: 40, weeklyRate: 4, streakDays: 2, color: "#a78bfa",
    milestones: [
      { label: "Resume v2", at: 1, done: true },
      { label: "First 10 sent", at: 10, done: true },
      { label: "First interview", at: 20, done: false },
      { label: "Offer signed", at: 40, done: false },
    ],
    history: [0, 2, 4, 7, 9, 10, 12],
  },
  {
    id: "g4", title: "Fitness Consistency", unit: "sessions", current: 38, target: 90, weeklyRate: 4, streakDays: 11, color: "#34d399",
    milestones: [
      { label: "Habit formed", at: 21, done: true },
      { label: "Halfway", at: 45, done: false },
      { label: "90-day complete", at: 90, done: false },
    ],
    history: [12, 17, 21, 26, 30, 34, 38],
  },
];

/* ------------------------------------------------------------------ */
/* Automations                                                         */
/* ------------------------------------------------------------------ */

export const seedAutomations: Automation[] = [
  {
    id: "a1", name: "Morning Briefing", icon: "sunrise", trigger: "Every day at 07:30, or on wake word after 06:00", schedule: "Daily · 07:30", enabled: true, lastRun: daysFromNow(0, -9), successRate: 0.99,
    history: [
      { id: uid(), time: daysFromNow(0, -9), status: "success", detail: "Briefed: 4 tasks due, 1 deadline alert, weather, top mail" },
      { id: uid(), time: daysFromNow(-1, -9), status: "success", detail: "Briefed: 3 tasks due, calendar clear" },
      { id: uid(), time: daysFromNow(-2, -9), status: "success", detail: "Briefed: 5 tasks due, 2 deadline alerts" },
    ],
  },
  {
    id: "a2", name: "Deadline Sentinel", icon: "siren", trigger: "When any task deadline is < 24h and status ≠ done", schedule: "Continuous watch", enabled: true, lastRun: daysFromNow(0, -2), successRate: 1,
    history: [
      { id: uid(), time: daysFromNow(0, -2), status: "success", detail: "Alert raised: DBMS assignment due in 22h" },
      { id: uid(), time: daysFromNow(-1, -5), status: "success", detail: "Alert raised: OS lab record due in 8h" },
    ],
  },
  {
    id: "a3", name: "DSA Drill Reminder", icon: "brain", trigger: "Daily at 21:00 if no LeetCode submission detected", schedule: "Daily · 21:00", enabled: true, lastRun: daysFromNow(-1, 3), successRate: 0.93,
    history: [
      { id: uid(), time: daysFromNow(-1, 3), status: "success", detail: "Nudged: streak at risk — 4 days skipped" },
      { id: uid(), time: daysFromNow(-2, 3), status: "success", detail: "Nudged: 0 submissions today" },
      { id: uid(), time: daysFromNow(-3, 3), status: "failed", detail: "LeetCode API timeout — retried, then skipped" },
    ],
  },
  {
    id: "a4", name: "Project File Watcher", icon: "eye", trigger: "On change in ~/dev/alumni-system/** → run lint + tests", schedule: "On file change", enabled: false, lastRun: daysFromNow(-2, -4), successRate: 0.87,
    history: [
      { id: uid(), time: daysFromNow(-2, -4), status: "failed", detail: "2 tests failing in events.test.ts — reported to console" },
      { id: uid(), time: daysFromNow(-2, -6), status: "success", detail: "Lint clean, 34 tests passed in 8.2s" },
    ],
  },
  {
    id: "a5", name: "Email Summarizer", icon: "mail", trigger: "Every 3h during 08:00–22:00, batch unread mail", schedule: "Every 3 hours", enabled: true, lastRun: daysFromNow(0, -1), successRate: 0.96,
    history: [
      { id: uid(), time: daysFromNow(0, -1), status: "success", detail: "Summarized 14 emails → 2 need action (internship reply, fee notice)" },
      { id: uid(), time: daysFromNow(0, -4), status: "success", detail: "Summarized 9 emails → nothing actionable" },
    ],
  },
  {
    id: "a6", name: "Focus Guard", icon: "shield", trigger: "During focus sessions → mute notifications, block distracting sites", schedule: "On focus start", enabled: true, lastRun: daysFromNow(-1, 2), successRate: 1,
    history: [
      { id: uid(), time: daysFromNow(-1, 2), status: "success", detail: "Blocked 3 interruptions during a 50-min session" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Notifications + command history                                     */
/* ------------------------------------------------------------------ */

export const seedNotifications: AppNotification[] = [
  { id: "n1", title: "Deadline in 22h", detail: "DBMS assignment is due tomorrow and is still in progress.", time: daysFromNow(0, -2), kind: "alert", read: false },
  { id: "n2", title: "Streak at risk", detail: "You have skipped DSA practice for 4 days. Tonight is a recovery window.", time: daysFromNow(0, -3), kind: "alert", read: false },
  { id: "n3", title: "Email triage complete", detail: "14 emails summarized — 2 need action.", time: daysFromNow(0, -1), kind: "info", read: false },
  { id: "n4", title: "Milestone reached", detail: "AWS prep crossed 60% — Networking + IAM module complete.", time: daysFromNow(-1), kind: "success", read: true },
];

export const seedCommands: CommandLogEntry[] = [
  { id: "c1", input: "debug the registration API error", summary: "Root cause found: ambiguous SQL join → fix suggested", time: daysFromNow(0, -1) },
  { id: "c2", input: "start focus 50", summary: "Focus session started · Focus Guard engaged", time: daysFromNow(0, -3) },
  { id: "c3", input: "add task revise dijkstra", summary: "Task created in DSA · due in 3 days", time: daysFromNow(0, -5) },
  { id: "c4", input: "morning briefing", summary: "Briefing delivered — 4 due items, 1 alert", time: daysFromNow(0, -9) },
  { id: "c5", input: "how is my aws goal", summary: "60% complete · on pace for cert in ~6 weeks", time: daysFromNow(-1, -2) },
];

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

export const analytics = {
  focusHours14d: [3.2, 4.1, 2.5, 5.0, 4.6, 1.8, 2.2, 4.8, 5.4, 3.9, 4.2, 2.1, 5.1, 4.4],
  codingByWeekday: [
    { label: "Mon", value: 3.4 }, { label: "Tue", value: 4.2 }, { label: "Wed", value: 2.8 },
    { label: "Thu", value: 4.9 }, { label: "Fri", value: 3.1 }, { label: "Sat", value: 6.2 }, { label: "Sun", value: 5.5 },
  ],
  productivity30d: [62, 64, 58, 71, 74, 69, 66, 72, 78, 75, 70, 64, 61, 68, 73, 77, 80, 76, 71, 69, 74, 79, 82, 78, 75, 72, 76, 81, 84, 78],
  completionByCategory: [
    { label: "College", value: 82, color: "#38bdf8" },
    { label: "DSA", value: 54, color: "#00e5ff" },
    { label: "Internship", value: 76, color: "#a78bfa" },
    { label: "Personal", value: 68, color: "#f59e0b" },
    { label: "Fitness", value: 88, color: "#34d399" },
  ],
  /** 12 weeks x 7 days, 0..4 intensity */
  consistency: Array.from({ length: 12 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const base = (w * 7 + d) % 9;
      return base === 0 ? 0 : base < 3 ? 1 : base < 5 ? 2 : base < 7 ? 3 : 4;
    }),
  ),
  insights: [
    { text: "Productivity drops 28% after midnight. Your 21:00–00:30 block delivers the highest output per hour.", kind: "warning" as const },
    { text: "Saturday is your strongest coding day — 6.2h average. Consider scheduling hard problems there.", kind: "positive" as const },
    { text: "DSA completion rate (54%) lags every other category. The 4-day skip streak is the main driver.", kind: "warning" as const },
    { text: "Fitness consistency is up 21% month-over-month and correlates with +9% next-day focus.", kind: "positive" as const },
  ],
};

export const dailyInsights: string[] = [
  "You have skipped DSA practice for 4 days. A 45-minute sliding-window session tonight restores the streak.",
  "The Alumni System demo is your highest-leverage deadline this week — the API fix is 80% scoped in the console.",
  "Best focus window opens at 21:00. I can start Focus Guard automatically when it begins.",
];

/* ------------------------------------------------------------------ */
/* Developer console — sample project                                  */
/* ------------------------------------------------------------------ */

const eventsRouteTs = `import { Router } from "express";
import { pool } from "../db";

const router = Router();

// POST /api/events/:id/register
router.post("/:id/register", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    const result = await pool.query(REGISTER_QUERY, [id, userId]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("registration failed", err);
    res.status(500).json({ error: "registration failed" });
  }
});

export default router;
`;

const registerSql = `-- registration + capacity check, single round trip
INSERT INTO registrations (event_id, user_id, created_at)
SELECT e.id, $2, NOW()
FROM events e
JOIN registrations ON event_id = e.id
WHERE e.id = $1
  AND e.capacity > (
    SELECT COUNT(*) FROM registrations WHERE event_id = e.id
  )
RETURNING id, event_id, user_id;
`;

const dbTs = `import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  console.error("unexpected pg pool error", err);
});
`;

export const sampleProject: FileNode = {
  name: "alumni-system", path: "alumni-system", type: "dir",
  children: [
    {
      name: "src", path: "alumni-system/src", type: "dir",
      children: [
        {
          name: "routes", path: "alumni-system/src/routes", type: "dir",
          children: [
            { name: "events.ts", path: "alumni-system/src/routes/events.ts", type: "file", language: "ts", content: eventsRouteTs },
            { name: "users.ts", path: "alumni-system/src/routes/users.ts", type: "file", language: "ts", content: `import { Router } from "express";\nimport { pool } from "../db";\n\nconst router = Router();\n\nrouter.get("/:id", async (req, res) => {\n  const { rows } = await pool.query(\n    "SELECT id, name, batch, company FROM users WHERE id = $1",\n    [req.params.id],\n  );\n  if (!rows[0]) return res.status(404).json({ error: "not found" });\n  res.json(rows[0]);\n});\n\nexport default router;\n` },
          ],
        },
        { name: "db.ts", path: "alumni-system/src/db.ts", type: "file", language: "ts", content: dbTs },
        { name: "register.sql", path: "alumni-system/src/register.sql", type: "file", language: "sql", content: registerSql },
      ],
    },
    { name: ".env", path: "alumni-system/.env", type: "file", language: "env", content: "DATABASE_URL=postgres://jarvis:•••@localhost:5432/alumni\nPORT=4000\n" },
    { name: "package.json", path: "alumni-system/package.json", type: "file", language: "json", content: `{\n  "name": "alumni-system",\n  "scripts": {\n    "dev": "tsx watch src/index.ts",\n    "test": "vitest run"\n  }\n}\n` },
  ],
};

export const sampleSqlError = `ERROR:  column reference "event_id" is ambiguous
LINE 4: JOIN registrations ON event_id = e.id
                              ^
QUERY:  INSERT INTO registrations (event_id, user_id, created_at)
        SELECT e.id, $2, NOW() FROM events e
        JOIN registrations ON event_id = e.id ...
CONTEXT: PL/pgSQL, POST /api/events/42/register → 500`;

export const seedTerminal: string[] = [
  "jarvis@core:~/dev/alumni-system$ npm run test",
  "  ✓ users.test.ts (6 tests) 412ms",
  "  ✗ events.test.ts (4 tests | 2 failed) 883ms",
  "    → POST /register returns 500 — expected 201",
  "jarvis@core:~/dev/alumni-system$ tail -1 logs/api.log",
  '  ERROR: column reference "event_id" is ambiguous',
];
