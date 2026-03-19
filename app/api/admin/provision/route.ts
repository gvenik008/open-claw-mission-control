import { NextRequest, NextResponse } from "next/server";
import { masterDb, genId } from "@/lib/master-db";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import Database from "better-sqlite3";

const HOME = process.env.HOME || "/Users/test7";
const MC_CODEBASE = join(HOME, ".openclaw/workspace/mission-control");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, displayName, telegramId, botToken, apiKey } = body;

    if (!username || !botToken || !apiKey) {
      return NextResponse.json({ error: "username, botToken, and apiKey are required" }, { status: 400 });
    }

    // Sanitize username
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9\-_]/g, "").slice(0, 30);
    if (!cleanUsername) return NextResponse.json({ error: "Invalid username" }, { status: 400 });

    // Check if exists
    const existing = masterDb.prepare("SELECT id FROM instances WHERE username = ?").get(cleanUsername);
    if (existing) return NextResponse.json({ error: `User "${cleanUsername}" already exists` }, { status: 409 });

    // Allocate ports
    const lastPorts = masterDb.prepare("SELECT MAX(gateway_port) as gp, MAX(mc_port) as mp FROM instances").get() as any;
    const gatewayPort = (lastPorts?.gp || 18789) + 1;
    const mcPort = (lastPorts?.mp || 3001) + 1;

    const openclawDir = join(HOME, `.openclaw-${cleanUsername}`);
    const workspaceDir = join(openclawDir, "workspace");
    const dataDir = join(openclawDir, "data");
    const dbPath = join(dataDir, "mission-control.db");

    // Create directories
    mkdirSync(join(workspaceDir, "memory"), { recursive: true });
    mkdirSync(join(workspaceDir, "registry"), { recursive: true });
    mkdirSync(join(openclawDir, "agents/main/sessions"), { recursive: true });
    mkdirSync(dataDir, { recursive: true });

    // Write workspace files
    const name = displayName || cleanUsername;
    writeFileSync(join(workspaceDir, "SOUL.md"), `# SOUL.md\n\nYou are an AI assistant for ${name}. Be helpful, concise, and resourceful.\n`);
    writeFileSync(join(workspaceDir, "AGENTS.md"), `# AGENTS.md\n\nWorkspace for ${name}.\n`);
    writeFileSync(join(workspaceDir, "USER.md"), `# USER.md\n\n- **Name:** ${name}\n- **Telegram ID:** ${telegramId || "not set"}\n`);

    // Seed shared skills/tools to registry
    try {
      const skills = masterDb.prepare("SELECT * FROM shared_skills").all() as any[];
      const mapped = skills.map((s: any) => ({
        id: s.id, name: s.name, category: s.category, description: s.description,
        requiredTools: JSON.parse(s.required_tools || "[]"), promptAdditions: s.prompt_additions,
      }));
      writeFileSync(join(workspaceDir, "registry/skills.json"), JSON.stringify(mapped, null, 2));
    } catch { writeFileSync(join(workspaceDir, "registry/skills.json"), "[]"); }

    try {
      const tools = masterDb.prepare("SELECT * FROM shared_tools").all() as any[];
      writeFileSync(join(workspaceDir, "registry/tools.json"), JSON.stringify(tools, null, 2));
    } catch { writeFileSync(join(workspaceDir, "registry/tools.json"), "[]"); }

    writeFileSync(join(workspaceDir, "registry/agents.json"), JSON.stringify([{
      agent_id: "main", name: `${name}-assistant`, role: "Main AI Assistant",
      type: "orchestrator", division: "none", lead: "user",
      model: "anthropic/claude-sonnet-4-6", workspace: workspaceDir, skills: [],
      tools: ["browser", "shell", "web_search", "web_fetch", "file_system", "git", "cron", "sub_agents"],
      created: new Date().toISOString().split("T")[0], status: "active",
    }], null, 2));

    // Seed user database
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
    `);
    userDb.prepare(`INSERT OR IGNORE INTO agents (agent_id, name, role, type, division, lead, model, workspace, skills, tools, status) VALUES ('main', ?, 'Main AI Assistant', 'orchestrator', 'none', 'user', 'anthropic/claude-sonnet-4-6', ?, '[]', '["browser","shell","web_search","web_fetch","file_system","git","cron","sub_agents"]', 'active')`).run(`${name}-assistant`, workspaceDir);

    // Seed shared data into user DB
    const sharedSkills = masterDb.prepare("SELECT * FROM shared_skills").all() as any[];
    for (const s of sharedSkills) {
      userDb.prepare(`INSERT OR IGNORE INTO skills (id, name, category, description, required_tools, prompt_additions) VALUES (?, ?, ?, ?, ?, ?)`).run(s.id, s.name, s.category, s.description, s.required_tools, s.prompt_additions);
    }
    const sharedTools = masterDb.prepare("SELECT * FROM shared_tools").all() as any[];
    for (const t of sharedTools) {
      userDb.prepare(`INSERT OR IGNORE INTO tools (id, name, category, description) VALUES (?, ?, ?, ?)`).run(t.id, t.name, t.category, t.description);
    }
    userDb.prepare(`INSERT INTO activities (id, agent_id, action, detail) VALUES (?, 'main', 'system_start', ?)`).run(genId(), `Provisioned for ${name}`);
    userDb.close();

    // OpenClaw config
    const config = {
      auth: { profiles: { "anthropic:default": { provider: "anthropic", mode: "api_key", apiKey } } },
      agents: {
        defaults: { model: { primary: "anthropic/claude-sonnet-4-6" }, models: { "anthropic/claude-sonnet-4-6": {}, "anthropic/claude-haiku-4-5": {} }, workspace: workspaceDir },
        list: [{ id: "main", model: { primary: "anthropic/claude-sonnet-4-6" } }],
      },
      tools: { profile: "full", sessions: { visibility: "all" }, agentToAgent: { enabled: true, allow: ["*"] } },
      commands: { native: "auto", restart: true },
      session: { dmScope: "per-channel-peer" },
      channels: { telegram: { enabled: true, dmPolicy: telegramId ? "allowlist" : "open", botToken, ...(telegramId ? { allowFrom: [parseInt(telegramId)] } : {}), groupPolicy: "allowlist", streaming: "partial" } },
      gateway: { port: gatewayPort, mode: "local", bind: "loopback", auth: { mode: "token", token: `mc-${cleanUsername}-${Date.now().toString(36)}` } },
      plugins: { entries: { telegram: { enabled: true } } },
    };
    writeFileSync(join(openclawDir, "openclaw.json"), JSON.stringify(config, null, 2));

    // LaunchAgent plists
    const launchAgentDir = join(HOME, "Library/LaunchAgents");

    writeFileSync(join(launchAgentDir, `ai.openclaw.gateway.${cleanUsername}.plist`), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>ai.openclaw.gateway.${cleanUsername}</string>
  <key>ProgramArguments</key><array><string>/usr/local/opt/node@22/bin/node</string><string>/usr/local/lib/node_modules/openclaw/dist/index.js</string><string>gateway</string><string>--port</string><string>${gatewayPort}</string></array>
  <key>WorkingDirectory</key><string>${openclawDir}</string>
  <key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/openclaw-${cleanUsername}.stdout.log</string>
  <key>StandardErrorPath</key><string>/tmp/openclaw-${cleanUsername}.stderr.log</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/opt/node@22/bin</string><key>HOME</key><string>${HOME}</string><key>OPENCLAW_HOME</key><string>${openclawDir}</string><key>OPENCLAW_GATEWAY_PORT</key><string>${gatewayPort}</string></dict>
</dict></plist>`);

    writeFileSync(join(launchAgentDir, `com.openclaw.mission-control.${cleanUsername}.plist`), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.openclaw.mission-control.${cleanUsername}</string>
  <key>ProgramArguments</key><array><string>/usr/local/bin/npx</string><string>next</string><string>start</string><string>-p</string><string>${mcPort}</string></array>
  <key>WorkingDirectory</key><string>${MC_CODEBASE}</string>
  <key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/mission-control-${cleanUsername}.stdout.log</string>
  <key>StandardErrorPath</key><string>/tmp/mission-control-${cleanUsername}.stderr.log</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/opt/node@22/bin</string><key>HOME</key><string>${HOME}</string><key>DATABASE_PATH</key><string>${dbPath}</string></dict>
</dict></plist>`);

    // Register in master DB
    const instanceId = genId();
    masterDb.prepare(`INSERT INTO instances (id, username, display_name, telegram_id, bot_token, gateway_port, mc_port, status, api_key, openclaw_dir, workspace_dir, db_path) VALUES (?, ?, ?, ?, ?, ?, ?, 'provisioned', ?, ?, ?, ?)`).run(
      instanceId, cleanUsername, name, telegramId || null, "***", gatewayPort, mcPort, "***", openclawDir, workspaceDir, dbPath
    );
    masterDb.prepare(`INSERT INTO master_activity (id, instance_id, action, detail) VALUES (?, ?, 'instance_provisioned', ?)`).run(
      genId(), instanceId, `"${name}" provisioned — GW:${gatewayPort} MC:${mcPort}`
    );

    return NextResponse.json({
      success: true,
      instance: { id: instanceId, username: cleanUsername, displayName: name, gatewayPort, mcPort, dbPath },
      message: `Instance "${name}" provisioned successfully`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
