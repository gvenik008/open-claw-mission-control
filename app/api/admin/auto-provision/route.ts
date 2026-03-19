import { NextRequest, NextResponse } from "next/server";
import { masterDb, genId } from "@/lib/master-db";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import Database from "better-sqlite3";

const HOME = process.env.HOME || "/Users/test7";
const MC_CODEBASE = join(HOME, ".openclaw/workspace/mission-control");

/**
 * Auto-provision a new user instance from Telegram onboarding.
 * Called by Gvenik during onboarding conversation.
 *
 * POST /api/admin/auto-provision
 * Body: {
 *   username: string,
 *   displayName: string,
 *   telegramId: string,
 *   agentName?: string,      // what they want their assistant called
 *   selectedSkills?: string[], // skill IDs they chose
 *   selectedTools?: string[],  // tool IDs they chose
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, displayName, telegramId, agentName, selectedSkills, selectedTools } = body;

    if (!username || !telegramId) {
      return NextResponse.json({ error: "username and telegramId required" }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9\-_]/g, "").slice(0, 30);
    if (!cleanUsername) return NextResponse.json({ error: "Invalid username" }, { status: 400 });

    // Check if already provisioned
    const existing = masterDb.prepare("SELECT * FROM instances WHERE username = ? OR telegram_id = ?").get(cleanUsername, telegramId) as any;
    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        instance: {
          username: existing.username,
          mcPort: existing.mc_port,
          mcUrl: `http://localhost:${existing.mc_port}`,
        },
        message: `User "${existing.username}" already provisioned on port ${existing.mc_port}`,
      });
    }

    // Allocate MC port (gateway stays the same — shared)
    const lastPort = masterDb.prepare("SELECT MAX(mc_port) as mp FROM instances").get() as any;
    const mcPort = (lastPort?.mp || 3001) + 1;

    const name = displayName || cleanUsername;
    const dataDir = join(HOME, `.openclaw/data/users/${cleanUsername}`);
    const dbPath = join(dataDir, "mission-control.db");

    mkdirSync(dataDir, { recursive: true });

    console.log(`🚀 Auto-provisioning "${cleanUsername}" on MC port ${mcPort}...`);

    // ─── Create user database ─────────────────────────────────────────
    const userDb = new Database(dbPath);
    userDb.pragma("journal_mode = WAL");
    userDb.exec(`
      CREATE TABLE IF NOT EXISTS agents (id INTEGER PRIMARY KEY AUTOINCREMENT, agent_id TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT DEFAULT '', type TEXT DEFAULT 'worker', division TEXT DEFAULT 'none', lead TEXT DEFAULT 'main', model TEXT DEFAULT 'anthropic/claude-sonnet-4-6', workspace TEXT DEFAULT '', skills TEXT DEFAULT '[]', tools TEXT DEFAULT '[]', personality TEXT DEFAULT '', status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS skills (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT DEFAULT '', required_tools TEXT DEFAULT '[]', prompt_additions TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS tools (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT DEFAULT 'Custom', description TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '', status TEXT DEFAULT 'pending', priority TEXT DEFAULT 'medium', assignee TEXT, created_by TEXT DEFAULT 'user', due_date TEXT, completed_at TEXT, tags TEXT DEFAULT '[]', agent_session TEXT DEFAULT '', result TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, action TEXT NOT NULL, detail TEXT DEFAULT '', metadata TEXT DEFAULT '{}', created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, status TEXT DEFAULT 'active', model TEXT DEFAULT '', started_at TEXT DEFAULT (datetime('now')), ended_at TEXT, token_count INTEGER DEFAULT 0, summary TEXT DEFAULT '');
      CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, agent_id TEXT DEFAULT 'main', type TEXT DEFAULT 'note', content TEXT NOT NULL, tags TEXT DEFAULT '[]', source TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS connections (id TEXT PRIMARY KEY, source_id TEXT NOT NULL, target_id TEXT NOT NULL, type TEXT DEFAULT 'reports_to', label TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), UNIQUE(source_id, target_id, type));
    `);

    // Seed main agent
    const assistantName = agentName || `${name}'s Assistant`;
    const skillsJson = JSON.stringify(selectedSkills || []);
    const toolsJson = JSON.stringify(selectedTools || ["browser", "shell", "web_search", "web_fetch", "file_system"]);

    userDb.prepare(`INSERT OR IGNORE INTO agents (agent_id, name, role, type, division, lead, model, skills, tools, status)
      VALUES ('main', ?, 'Main AI Assistant', 'orchestrator', 'none', 'user', 'anthropic/claude-sonnet-4-6', ?, ?, 'active')
    `).run(assistantName, skillsJson, toolsJson);

    // Seed shared skills from master DB
    try {
      const sharedSkills = masterDb.prepare("SELECT * FROM shared_skills").all() as any[];
      const upsert = userDb.prepare(`INSERT OR IGNORE INTO skills (id, name, category, description, required_tools, prompt_additions) VALUES (?, ?, ?, ?, ?, ?)`);
      for (const s of sharedSkills) {
        upsert.run(s.id, s.name, s.category, s.description, s.required_tools, s.prompt_additions);
      }
    } catch {}

    // Seed shared tools from master DB
    try {
      const sharedTools = masterDb.prepare("SELECT * FROM shared_tools").all() as any[];
      const upsert = userDb.prepare(`INSERT OR IGNORE INTO tools (id, name, category, description) VALUES (?, ?, ?, ?)`);
      for (const t of sharedTools) {
        upsert.run(t.id, t.name, t.category, t.description);
      }
    } catch {}

    // Initial activity
    userDb.prepare(`INSERT INTO activities (id, agent_id, action, detail) VALUES (?, 'main', 'system_start', ?)`).run(
      genId(), `Provisioned for ${name} via Telegram onboarding`
    );

    // Add user→main connection
    userDb.prepare(`INSERT OR IGNORE INTO connections (id, source_id, target_id, type) VALUES (?, 'user', 'main', 'reports_to')`).run(genId());

    userDb.close();

    // ─── Create LaunchAgent for Mission Control ───────────────────────
    const launchAgentDir = join(HOME, "Library/LaunchAgents");
    const mcPlistPath = join(launchAgentDir, `com.openclaw.mission-control.${cleanUsername}.plist`);

    writeFileSync(mcPlistPath, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.openclaw.mission-control.${cleanUsername}</string>
  <key>ProgramArguments</key><array><string>/usr/local/bin/npx</string><string>next</string><string>start</string><string>-p</string><string>${mcPort}</string></array>
  <key>WorkingDirectory</key><string>${MC_CODEBASE}</string>
  <key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/mission-control-${cleanUsername}.stdout.log</string>
  <key>StandardErrorPath</key><string>/tmp/mission-control-${cleanUsername}.stderr.log</string>
  <key>EnvironmentVariables</key><dict>
    <key>PATH</key><string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/opt/node@22/bin</string>
    <key>HOME</key><string>${HOME}</string>
    <key>DATABASE_PATH</key><string>${dbPath}</string>
  </dict>
</dict></plist>`);

    // Start the service
    try {
      const { execSync } = require("child_process");
      const uid = execSync("id -u").toString().trim();
      execSync(`launchctl bootstrap gui/${uid} "${mcPlistPath}" 2>/dev/null || true`);
    } catch {}

    // ─── Register in master DB ────────────────────────────────────────
    const instanceId = genId();
    masterDb.prepare(`
      INSERT INTO instances (id, username, display_name, telegram_id, bot_token, gateway_port, mc_port, status, api_key, openclaw_dir, workspace_dir, db_path)
      VALUES (?, ?, ?, ?, 'shared', 18789, ?, 'running', 'shared', '', '', ?)
    `).run(instanceId, cleanUsername, name, telegramId, mcPort, dbPath);

    masterDb.prepare(`INSERT INTO master_activity (id, instance_id, action, detail) VALUES (?, ?, 'auto_provisioned', ?)`).run(
      genId(), instanceId, `"${name}" auto-provisioned via Telegram (MC:${mcPort})`
    );

    return NextResponse.json({
      success: true,
      alreadyExists: false,
      instance: {
        id: instanceId,
        username: cleanUsername,
        displayName: name,
        mcPort,
        mcUrl: `http://localhost:${mcPort}`,
        dbPath,
        agentName: assistantName,
        skills: selectedSkills || [],
        tools: selectedTools || [],
      },
      message: `Instance "${name}" provisioned! Mission Control: http://localhost:${mcPort}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Check if a user is already provisioned.
 * GET /api/admin/auto-provision?telegramId=12345
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const telegramId = searchParams.get("telegramId");
  const username = searchParams.get("username");

  if (!telegramId && !username) {
    return NextResponse.json({ error: "telegramId or username required" }, { status: 400 });
  }

  let instance;
  if (telegramId) {
    instance = masterDb.prepare("SELECT * FROM instances WHERE telegram_id = ?").get(telegramId);
  } else {
    instance = masterDb.prepare("SELECT * FROM instances WHERE username = ?").get(username);
  }

  if (instance) {
    const inst = instance as any;
    return NextResponse.json({
      exists: true,
      instance: {
        username: inst.username,
        displayName: inst.display_name,
        mcPort: inst.mc_port,
        mcUrl: `http://localhost:${inst.mc_port}`,
        status: inst.status,
      },
    });
  }

  return NextResponse.json({ exists: false });
}
