import Database from "better-sqlite3";
import { join } from "path";
import { mkdirSync } from "fs";

const HOME = process.env.HOME || "/Users/test7";
const DATA_DIR = process.env.MASTER_DB_DIR || join(HOME, ".openclaw/data");
mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = join(DATA_DIR, "master.db");

const globalForDb = globalThis as unknown as { masterDb: Database.Database | undefined };

function createDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}

export const masterDb = globalForDb.masterDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.masterDb = masterDb;

function initSchema(db: Database.Database) {
  db.exec(`
    -- Users / Instances
    CREATE TABLE IF NOT EXISTS instances (
      id            TEXT PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      display_name  TEXT NOT NULL DEFAULT '',
      telegram_id   TEXT,
      bot_token     TEXT,
      gateway_port  INTEGER UNIQUE NOT NULL,
      mc_port       INTEGER UNIQUE NOT NULL,
      status        TEXT NOT NULL DEFAULT 'provisioning',
      api_key       TEXT NOT NULL DEFAULT '',
      openclaw_dir  TEXT NOT NULL DEFAULT '',
      workspace_dir TEXT NOT NULL DEFAULT '',
      pid_gateway   INTEGER,
      pid_mc        INTEGER,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Shared skills (superadmin only)
    CREATE TABLE IF NOT EXISTS shared_skills (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      category         TEXT NOT NULL,
      description      TEXT NOT NULL DEFAULT '',
      required_tools   TEXT NOT NULL DEFAULT '[]',
      prompt_additions TEXT NOT NULL DEFAULT '',
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Shared tools (superadmin only)
    CREATE TABLE IF NOT EXISTS shared_tools (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'Custom',
      description TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Activity log across all instances
    CREATE TABLE IF NOT EXISTS master_activity (
      id          TEXT PRIMARY KEY,
      instance_id TEXT,
      action      TEXT NOT NULL,
      detail      TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_master_activity_created ON master_activity(created_at);
    CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status);
  `);
}

export function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default masterDb;
