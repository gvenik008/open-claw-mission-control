import { NextRequest, NextResponse } from "next/server";
import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import { db } from "@/lib/db";

const WORKSPACE = (process.env.HOME || "") + "/.openclaw/workspace";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (path) {
    // Sanitize path to prevent directory traversal
    const safePath = path.replace(/\.\.\//g, "").replace(/^\//, "");
    let fullPath: string;
    if (path.startsWith("../workspace-")) {
      // Agent workspace files — allow these specifically
      const homePath = process.env.HOME || "";
      fullPath = join(homePath + "/.openclaw", path.replace("../", ""));
    } else {
      fullPath = join(WORKSPACE, safePath);
    }

    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const content = readFileSync(fullPath, "utf8");
    const stat = statSync(fullPath);
    return NextResponse.json({ path, content, size: stat.size, modified: stat.mtime });
  }

  // Return file tree
  const files: any[] = [];

  // Main workspace memory files
  const mainFiles = ["MEMORY.md", "SOUL.md", "USER.md", "IDENTITY.md", "AGENTS.md", "TOOLS.md", "HEARTBEAT.md"];
  for (const f of mainFiles) {
    const fp = join(WORKSPACE, f);
    if (existsSync(fp)) {
      const stat = statSync(fp);
      files.push({ path: f, name: f, agent: "main", type: "config", size: stat.size, modified: stat.mtime });
    }
  }

  // Memory directory
  const memDir = join(WORKSPACE, "memory");
  if (existsSync(memDir)) {
    const memFiles = readdirSync(memDir)
      .filter((f) => f.endsWith(".md") || f.endsWith(".json"))
      .sort()
      .reverse();
    for (const f of memFiles) {
      const fp = join(memDir, f);
      const stat = statSync(fp);
      files.push({ path: `memory/${f}`, name: f, agent: "main", type: "daily", size: stat.size, modified: stat.mtime });
    }
  }

  // Agent workspace files
  let agents: any[] = [];
  try {
    agents = db.prepare("SELECT agent_id, name FROM agents WHERE status = 'active'").all() as any[];
  } catch {}

  for (const agent of agents) {
    const wsDir = (process.env.HOME || "") + `/.openclaw/workspace-${agent.agent_id}`;
    if (!existsSync(wsDir)) continue;
    for (const f of ["SOUL.md", "AGENTS.md"]) {
      const fp = join(wsDir, f);
      if (existsSync(fp)) {
        const stat = statSync(fp);
        files.push({
          path: `../workspace-${agent.agent_id}/${f}`,
          name: f,
          agent: agent.agent_id,
          agentName: agent.name,
          type: "agent-config",
          size: stat.size,
          modified: stat.mtime,
        });
      }
    }
    const agentMem = join(wsDir, "memory");
    if (existsSync(agentMem)) {
      const agentMemFiles = readdirSync(agentMem)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .reverse()
        .slice(0, 5);
      for (const f of agentMemFiles) {
        const fp = join(agentMem, f);
        const stat = statSync(fp);
        files.push({
          path: `../workspace-${agent.agent_id}/memory/${f}`,
          name: f,
          agent: agent.agent_id,
          agentName: agent.name,
          type: "agent-daily",
          size: stat.size,
          modified: stat.mtime,
        });
      }
    }
  }

  let dbMemories: any[] = [];
  try {
    dbMemories = db.prepare("SELECT * FROM memories ORDER BY created_at DESC LIMIT 50").all();
  } catch {}

  return NextResponse.json({ files, dbMemories });
}
