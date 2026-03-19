import Database from "better-sqlite3";
import { join, dirname } from "path";
import { mkdirSync } from "fs";

// DATABASE_PATH env var allows per-instance databases from the same codebase
const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), "data", "mission-control.db");

// Ensure DB directory exists
mkdirSync(dirname(DB_PATH), { recursive: true });

// Singleton
const globalForDb = globalThis as unknown as { db: Database.Database | undefined };

function createDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}

export const db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

// ─── Schema ───────────────────────────────────────────────────────────────────

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT '',
      type        TEXT NOT NULL DEFAULT 'worker',
      division    TEXT NOT NULL DEFAULT 'none',
      lead        TEXT NOT NULL DEFAULT 'main',
      model       TEXT NOT NULL DEFAULT 'anthropic/claude-sonnet-4-6',
      workspace   TEXT NOT NULL DEFAULT '',
      skills      TEXT NOT NULL DEFAULT '[]',
      tools       TEXT NOT NULL DEFAULT '[]',
      personality TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skills (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      category         TEXT NOT NULL,
      description      TEXT NOT NULL DEFAULT '',
      required_tools   TEXT NOT NULL DEFAULT '[]',
      prompt_additions TEXT NOT NULL DEFAULT '',
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tools (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'Custom',
      description TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      status       TEXT NOT NULL DEFAULT 'pending',
      priority     TEXT NOT NULL DEFAULT 'medium',
      assignee     TEXT,
      created_by   TEXT NOT NULL DEFAULT 'user',
      due_date     TEXT,
      completed_at TEXT,
      tags         TEXT NOT NULL DEFAULT '[]',
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activities (
      id         TEXT PRIMARY KEY,
      agent_id   TEXT NOT NULL,
      action     TEXT NOT NULL,
      detail     TEXT NOT NULL DEFAULT '',
      metadata   TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_activities_agent ON activities(agent_id);
    CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);

    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      agent_id    TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'active',
      model       TEXT NOT NULL DEFAULT '',
      started_at  TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at    TEXT,
      token_count INTEGER NOT NULL DEFAULT 0,
      summary     TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);

    CREATE TABLE IF NOT EXISTS memories (
      id         TEXT PRIMARY KEY,
      agent_id   TEXT NOT NULL DEFAULT 'main',
      type       TEXT NOT NULL DEFAULT 'note',
      content    TEXT NOT NULL,
      tags       TEXT NOT NULL DEFAULT '[]',
      source     TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_id);
    CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);

    CREATE TABLE IF NOT EXISTS connections (
      id         TEXT PRIMARY KEY,
      source_id  TEXT NOT NULL,
      target_id  TEXT NOT NULL,
      type       TEXT NOT NULL DEFAULT 'reports_to',
      label      TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(source_id, target_id, type)
    );
    CREATE INDEX IF NOT EXISTS idx_connections_source ON connections(source_id);
    CREATE INDEX IF NOT EXISTS idx_connections_target ON connections(target_id);
  `);
}

// ─── Helper: generate IDs ─────────────────────────────────────────────────────

export function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default db;
