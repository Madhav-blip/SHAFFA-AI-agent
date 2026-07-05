import type { FileNode } from "@/lib/types";

/** ISO string n days from now (negative = past) */
export const daysFromNow = (n: number, hours = 0): string =>
  new Date(Date.now() + n * 86_400_000 + hours * 3_600_000).toISOString();

export const uid = (): string => Math.random().toString(36).slice(2, 10);

/* ------------------------------------------------------------------ */
/* Developer console — demo workspace for the debugging workflow.      */
/* (Not user data: this is the console's built-in exercise project.)   */
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
    { name: ".env", path: "alumni-system/.env", type: "file", language: "env", content: "DATABASE_URL=postgres://shaffa:•••@localhost:5432/alumni\nPORT=4000\n" },
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
  "shaffa@core:~/dev/alumni-system$ npm run test",
  "  ✓ users.test.ts (6 tests) 412ms",
  "  ✗ events.test.ts (4 tests | 2 failed) 883ms",
  "    → POST /register returns 500 — expected 201",
  "shaffa@core:~/dev/alumni-system$ tail -1 logs/api.log",
  '  ERROR: column reference "event_id" is ambiguous',
];
