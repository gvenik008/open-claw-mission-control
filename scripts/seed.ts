import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME || "/Users/test7";
const REGISTRY = join(HOME, ".openclaw/workspace/registry");
const DB_PATH = join(process.cwd(), "data", "mission-control.db");

mkdirSync(join(process.cwd(), "data"), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Run schema first (same as db.ts)
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT, agent_id TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    role TEXT DEFAULT '', type TEXT DEFAULT 'worker', division TEXT DEFAULT 'none',
    lead TEXT DEFAULT 'main', model TEXT DEFAULT 'anthropic/claude-sonnet-4-6',
    workspace TEXT DEFAULT '', skills TEXT DEFAULT '[]', tools TEXT DEFAULT '[]',
    personality TEXT DEFAULT '', status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
    description TEXT DEFAULT '', required_tools TEXT DEFAULT '[]',
    prompt_additions TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tools (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT DEFAULT 'Custom',
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '',
    status TEXT DEFAULT 'pending', priority TEXT DEFAULT 'medium',
    assignee TEXT, created_by TEXT DEFAULT 'user', due_date TEXT,
    completed_at TEXT, tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, action TEXT NOT NULL,
    detail TEXT DEFAULT '', metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, status TEXT DEFAULT 'active',
    model TEXT DEFAULT '', started_at TEXT DEFAULT (datetime('now')),
    ended_at TEXT, token_count INTEGER DEFAULT 0, summary TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY, agent_id TEXT DEFAULT 'main', type TEXT DEFAULT 'note',
    content TEXT NOT NULL, tags TEXT DEFAULT '[]', source TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log("🌱 Seeding database...");

// ─── Agents ─────────────────────────────────────────────────────────
try {
  const agents = JSON.parse(readFileSync(join(REGISTRY, "agents.json"), "utf8"));
  console.log(`  Importing ${agents.length} agents...`);
  const upsert = db.prepare(`
    INSERT INTO agents (agent_id, name, role, type, division, lead, model, workspace, skills, tools, personality, status)
    VALUES (@agent_id, @name, @role, @type, @division, @lead, @model, @workspace, @skills, @tools, @personality, @status)
    ON CONFLICT(agent_id) DO UPDATE SET
      name=@name, role=@role, type=@type, division=@division, lead=@lead,
      model=@model, workspace=@workspace, skills=@skills, tools=@tools,
      personality=@personality, status=@status, updated_at=datetime('now')
  `);
  for (const a of agents) {
    upsert.run({
      agent_id: a.agent_id,
      name: a.name,
      role: a.role || "",
      type: a.type || "worker",
      division: a.division || "none",
      lead: a.lead || "main",
      model: a.model || "anthropic/claude-sonnet-4-6",
      workspace: a.workspace || "",
      skills: JSON.stringify(a.skills || []),
      tools: JSON.stringify(a.tools || []),
      personality: a.personality || "",
      status: a.status || "active",
    });
  }
  console.log("  ✓ Agents imported");
} catch (e: any) {
  console.log(`  ✗ Agents: ${e.message}`);
}

// ─── Skills ─────────────────────────────────────────────────────────
try {
  const skills = JSON.parse(readFileSync(join(REGISTRY, "skills.json"), "utf8"));
  console.log(`  Importing ${skills.length} skills...`);
  const upsert = db.prepare(`
    INSERT INTO skills (id, name, category, description, required_tools, prompt_additions)
    VALUES (@id, @name, @category, @description, @required_tools, @prompt_additions)
    ON CONFLICT(id) DO UPDATE SET
      name=@name, category=@category, description=@description,
      required_tools=@required_tools, prompt_additions=@prompt_additions,
      updated_at=datetime('now')
  `);
  for (const s of skills) {
    upsert.run({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description || "",
      required_tools: JSON.stringify(s.requiredTools || []),
      prompt_additions: s.promptAdditions || "",
    });
  }
  console.log("  ✓ Skills imported");
} catch (e: any) {
  console.log(`  ✗ Skills: ${e.message}`);
}

// ─── Tools ──────────────────────────────────────────────────────────
try {
  const tools = JSON.parse(readFileSync(join(REGISTRY, "tools.json"), "utf8"));
  console.log(`  Importing ${tools.length} tools...`);
  const upsert = db.prepare(`
    INSERT INTO tools (id, name, category, description)
    VALUES (@id, @name, @category, @description)
    ON CONFLICT(id) DO UPDATE SET
      name=@name, category=@category, description=@description, updated_at=datetime('now')
  `);
  for (const t of tools) {
    upsert.run({
      id: t.id,
      name: t.name,
      category: t.category || "Custom",
      description: t.description || "",
    });
  }
  console.log("  ✓ Tools imported");
} catch (e: any) {
  console.log(`  ✗ Tools: ${e.message}`);
}

// ─── Initial Activities ─────────────────────────────────────────────
const count = db.prepare("SELECT COUNT(*) as c FROM activities").get() as any;
if (count.c === 0) {
  console.log("  Creating initial activity entries...");
  const insert = db.prepare(`
    INSERT INTO activities (id, agent_id, action, detail)
    VALUES (@id, @agent_id, @action, @detail)
  `);
  const activities = [
    { id: "act-init-1", agent_id: "main", action: "system_start", detail: "Mission Control initialized" },
    { id: "act-init-2", agent_id: "main", action: "agent_deployed", detail: "Gvenik (main orchestrator) online" },
    { id: "act-init-3", agent_id: "qa-lead", action: "agent_deployed", detail: "Atlas deployed to QA & Testing" },
    { id: "act-init-4", agent_id: "qa-functional", action: "agent_deployed", detail: "Scout deployed to QA & Testing" },
    { id: "act-init-5", agent_id: "qa-security", action: "agent_deployed", detail: "Sentinel deployed to QA & Testing" },
    { id: "act-init-6", agent_id: "qa-general", action: "agent_deployed", detail: "Rover deployed to QA & Testing" },
  ];
  for (const a of activities) {
    insert.run(a);
  }
  console.log("  ✓ Activity entries created");
}

console.log("✅ Seed complete!");
db.close();
