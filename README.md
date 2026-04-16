# Mission Control — OpenClaw Agent Dashboard

A dark-themed dashboard for managing AI agent teams, tasks, QA reports, and automation — built with Next.js 14 and SQLite.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)

## What is this?

Mission Control is a self-hosted command center for orchestrating AI agent teams. It was built to manage QA testing, security audits, SEO analysis, and product reviews — all coordinated through a team of specialized AI agents.

### Features

- **19 pages** — Dashboard, Tasks (kanban), Agents, Team Canvas, Office (infinite canvas), Skills & Tools, Memory, Reports, Docs, Calendar, Pipeline, Factory, Sessions, Monitoring, Settings, Master Control, Instances, Shared Registry, Activity Log
- **9 AI agents** — Orchestrator, QA Lead, Functional QA, Security QA, General QA, Product Manager, SEO Analyst, Frontend Engineer, Backend Engineer
- **Task management** — Create, assign, prioritize, and track tasks across agents
- **Agent training** — Skills, tools, personality, and lesson management per agent
- **QA reports** — Stored and browsable results from automated testing rounds
- **Multi-user** — Per-user database isolation with Telegram bot integration
- **Command Palette** — `Cmd+K` global search across tasks, agents, reports
- **Auto-deploy** — Git post-commit hook builds and restarts all instances

### Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (dark theme, Linear-inspired) |
| Database | SQLite via `better-sqlite3` |
| Icons | `lucide-react` |
| Canvas | `@xyflow/react` (Team Canvas, Office) |
| Runtime | Node.js 22+ |

## Quick Start

### Prerequisites

- **Node.js** v22 or higher
- **npm** v10+
- macOS / Linux (SQLite native module)

### 1. Clone

```bash
cd ~/.openclaw/workspace   # or any directory you prefer
git clone https://github.com/gvenik008/open-claw-mission-control.git mission-control
cd mission-control
```

### 2. Install dependencies

```bash
npm install
```

This installs ~60 packages including `better-sqlite3` (compiled natively).

### 3. Create environment file

```bash
echo 'DATABASE_URL="file:./dev.db"' > .env
```

### 4. Initialize the database

The SQLite database is auto-created on first run. The schema in `lib/db.ts` creates all 12 tables automatically.

To seed with agents, skills, and tools from the registry:

```bash
npx tsx scripts/seed.ts
```

> **Note:** The seed script reads from `~/.openclaw/workspace/registry/` by default. If you don't have a registry directory, the app still works — agents can be created from the Factory page in the UI.

### 5. Build and run

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm run start -- -p 3001
```

### 6. Open

Visit **http://localhost:3001** — you should see the dashboard.

## Project Structure

```
mission-control/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard
│   ├── tasks/              # Task kanban board
│   ├── agents/             # Agent list + detail
│   ├── team/               # Team Canvas (org chart)
│   ├── office/             # Infinite canvas workspace
│   ├── skills-tools/       # Skills & Tools registry
│   ├── memory/             # Agent memory browser
│   ├── reports/            # QA report viewer
│   ├── docs/               # Documentation
│   ├── calendar/           # Cron job calendar
│   ├── pipeline/           # Task pipeline (kanban)
│   ├── factory/            # Agent creation templates
│   ├── sessions/           # Active agent sessions
│   ├── radar/              # System monitoring
│   ├── settings/           # Configuration
│   ├── admin/              # Admin pages
│   │   ├── page.tsx        # Master Control
│   │   ├── instances/      # Multi-instance manager
│   │   ├── shared/         # Shared registry
│   │   └── activity/       # Activity log
│   └── api/                # API routes (20+ endpoints)
│       ├── tasks/          # Task CRUD
│       ├── deploy-agent/   # Agent CRUD
│       ├── skills/         # Skills CRUD
│       ├── suggest/        # AI training suggestions
│       ├── skill-match/    # Task→Agent matching
│       ├── stats/          # Usage statistics
│       ├── git/            # GitHub/GitLab integration
│       └── ...
├── components/
│   ├── Sidebar.tsx         # Navigation sidebar
│   └── CommandPalette.tsx  # Cmd+K search
├── lib/
│   ├── db.ts               # SQLite connection + schema
│   ├── master-db.ts        # Master control database
│   ├── sanitize.ts         # Input sanitization
│   ├── user-router.ts      # Multi-user proxy routing
│   └── agent-models.ts     # Agent model definitions
├── scripts/
│   └── seed.ts             # Database seeder
├── reports/                # QA reports (Markdown + PDF)
├── data/                   # Database files (gitignored)
│   ├── mission-control.db  # Main SQLite database
│   └── instances.json      # Multi-instance config
├── deploy.sh               # Auto-deploy script
└── start-instances.sh      # Multi-instance starter
```

## Database

SQLite with 12 tables, auto-created on first connection:

| Table | Purpose |
|-------|---------|
| `agents` | Agent definitions (name, role, skills, tools, personality) |
| `skills` | Skill registry |
| `tools` | Tool registry |
| `tasks` | Task tracking (title, status, assignee, priority, result) |
| `activities` | Agent activity log |
| `sessions` | Agent session tracking |
| `memories` | Agent memory/knowledge store |
| `connections` | Agent relationship graph |
| `cron_jobs` | Scheduled automation |
| `git_connections` | GitHub/GitLab tokens |
| `notifications` | In-app notification center |

### Database Location

By default: `data/mission-control.db` (relative to project root).

Override with the `DATABASE_PATH` environment variable for production:

```bash
DATABASE_PATH=/path/to/your/mission-control.db npm run start -- -p 3001
```

## Multi-Instance Setup

Mission Control supports running multiple isolated instances (one per user) from a single codebase.

### `data/instances.json`

```json
[
  {
    "id": "samvel",
    "name": "Samvel",
    "port": 3001,
    "dbPath": "/absolute/path/to/samvel/mission-control.db",
    "telegramId": "1234567890"
  },
  {
    "id": "anna",
    "name": "Anna",
    "port": 3002,
    "dbPath": "/absolute/path/to/anna/mission-control.db",
    "telegramId": "0987654321"
  }
]
```

Start all instances:

```bash
./start-instances.sh
```

Or deploy (build once + restart all):

```bash
./deploy.sh
```

## API Reference

All endpoints are under `/api/`. Key routes:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/tasks` | List / create tasks |
| PATCH | `/api/tasks` | Update task (status, assignee, etc.) |
| GET/POST | `/api/deploy-agent` | List / create agents |
| GET/POST | `/api/skills` | List / create skills |
| POST | `/api/skill-match` | Match task description to best agent |
| POST | `/api/suggest` | Get AI training suggestions |
| GET | `/api/stats` | Usage statistics |
| GET/POST | `/api/notifications` | Notification center |
| GET/POST | `/api/git` | GitHub/GitLab connections |
| GET | `/api/metrics` | System metrics |
| GET/POST | `/api/memory` | Agent memory files |
| GET | `/api/reports` | QA reports list |
| POST | `/api/send-report` | Send report as file |

## OpenClaw Integration

Mission Control is designed to work with [OpenClaw](https://github.com/openclaw/openclaw) — an AI agent framework. When connected:

- Agents are spawned as OpenClaw sub-agents
- Tasks are executed via the OpenClaw gateway
- Reports are generated and stored automatically
- Telegram bot commands (`/task`, `/team`, `/board`, `/test`) create and manage tasks

But Mission Control also works standalone as a dashboard — no OpenClaw required for the UI.

## Design

Dark theme inspired by [Linear](https://linear.app):

- Background: `#0a0a0a`
- Surface: `#111111`
- Cards: `#1a1a1a`
- Accent: `#5e6ad2` (indigo)
- Font: Inter / JetBrains Mono

## License

MIT

---

Built with 🐣 by [Gvenik](https://github.com/gvenik008) + [OpenClaw](https://openclaw.ai)
