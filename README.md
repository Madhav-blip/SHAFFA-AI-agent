# S.H.A.F.F.A — Personal AI Operating System

A cinematic, HUD-style AI operating system for productivity, developer workflows, and personal life management. Not a chatbot — a full-screen command center with live widgets, an animated AI core, a developer console, and an autonomous agent architecture.

## Quick start

```bash
npm install
npm run dev        # → http://localhost:3000
```

The UI is fully interactive out of the box with a local command engine and rich sample data. To unlock full cloud reasoning — ask SHAFFA anything, and let Claude drive the app's own tools — put your API key in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-…   # from console.anthropic.com/settings/keys
```

Local intents (tasks, focus, briefings, memory, navigation) run instantly and offline; anything else escalates to `/api/ai`, where Claude answers with your live app context (tasks, goals, memories) and can call SHAFFA's tools: create/complete tasks, store memories, start focus sessions, toggle automations, log goal progress, and navigate screens. Note: the API cannot use claude.ai's Gmail/Drive connectors — those are tied to the Claude app, not API keys; email/drive access needs its own Google OAuth integration (see `server/` for the intended architecture).

Try these in the command bar (press `/` to focus it, or click the mic):

- `morning briefing` · `what is due today` · `system status`
- `add task: revise dp patterns` · `complete dbms`
- `start focus 50` · `remember that demo day is friday`
- `open console`, then click **Debug error** to watch the SQL debugging workflow

## Screens

| Route | Screen |
| --- | --- |
| `/` | Dashboard — AI core, today overview, deadlines, focus timer, productivity, insights |
| `/memory` | Memory engine — semantic search, edit/delete, AI-linked connections, recall strength |
| `/tasks` | Task grid — kanban ⇄ list toggle, drag-and-drop, priorities, recurring, completion FX |
| `/goals` | Goal tracker — progress rings, streaks, milestone timelines, predictive ETAs |
| `/console` | Developer console — file tree, terminal, explain/debug/generate, SQL root-cause flow |
| `/automation` | Automation center — triggers, schedules, run-now, execution history |
| `/analytics` | Analytics — focus/coding/productivity charts, consistency heatmap, AI insights |

## Architecture

```
src/
  app/                  # one route per screen (App Router, client screens)
  components/
    shell/              # TopBar · Sidebar · RightPanel · CommandBar · Particles
    core/AICore.tsx     # animated core: idle / listening / processing / responding
    ui/                 # glass primitives + custom SVG chart library
    dashboard/ console/ # screen-specific widgets
  lib/
    types.ts            # shared domain types
    data/seed.ts        # sample data + demo project
    ai/engine.ts        # local intent engine (nav, tasks, focus, briefing, debug…)
    store/              # zustand: jarvis · tasks · memory · goals · automations · focus

server/                 # reference backend (Express + MongoDB)
  src/routes.ts         # REST + /api/ai/command (RAG + tool loop)
  src/models.ts         # mongoose schemas incl. memory embeddings
  src/services/
    memoryEngine.ts     # embed → vector search → nightly consolidation/decay
    agents.ts           # planner/coding/research/automation via Anthropic tool calling
    voicePipeline.ts    # wake word → STT → reasoning → tools → TTS
    pcAutomation.ts     # allowlisted app/file/command/system actions
```

### Voice pipeline

Wake word → STT → AI reasoning → tool execution → TTS. The web client uses the browser `SpeechRecognition` / `speechSynthesis` APIs as a zero-dependency fallback (mic button in the command bar; enable spoken replies in Settings). The production path is documented in `server/src/services/voicePipeline.ts`.

### AI flow

Every command goes through: intent match in `lib/ai/engine.ts` (instant, offline) → in production, unresolved input escalates to `/api/ai/command`, which retrieves memories (RAG), runs a Claude tool-calling loop against the task/goal/automation/PC tools, and logs the full trace.

## Stack

Next.js 16 · TypeScript · Tailwind CSS 4 · Framer Motion · Zustand · Express · MongoDB (Atlas Vector Search) · Anthropic SDK
