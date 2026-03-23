import { NextRequest, NextResponse } from "next/server";
import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join, resolve, normalize } from "path";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const HOME = process.env.HOME || "";
const WORKSPACE = join(HOME, ".openclaw", "workspace");
const OPENCLAW_ROOT = join(HOME, ".openclaw");

// Allowed file extensions
const ALLOWED_EXT = new Set([".md", ".json", ".yaml", ".yml", ".txt", ".toml"]);

// Validate and resolve a path to prevent traversal attacks
function safePath(requestedPath: string): string | null {
  // Block null bytes
  if (requestedPath.includes("\0")) return null;

  // Decode any URL encoding
  let decoded: string;
  try {
    decoded = decodeURIComponent(requestedPath);
  } catch {
    return null;
  }

  // Block null bytes after decode
  if (decoded.includes("\0")) return null;

  let fullPath: string;

  if (decoded.startsWith("../workspace-")) {
    // Agent workspace files — resolve under .openclaw/
    const relative = decoded.replace(/^\.\.\//, "");
    fullPath = resolve(OPENCLAW_ROOT, relative);
  } else {
    // Main workspace files
    fullPath = resolve(WORKSPACE, decoded);
  }

  // Normalize and verify the resolved path stays within allowed directories
  const normalized = normalize(fullPath);

  // Must be under ~/.openclaw/workspace or ~/.openclaw/workspace-*
  const isUnderMainWorkspace = normalized.startsWith(WORKSPACE + "/") || normalized === WORKSPACE;
  const isUnderAgentWorkspace = normalized.startsWith(OPENCLAW_ROOT + "/workspace-");

  if (!isUnderMainWorkspace && !isUnderAgentWorkspace) {
    return null; // Path traversal attempt
  }

  // Check file extension
  const ext = normalized.slice(normalized.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return null; // Disallowed file type
  }

  return normalized;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (path) {
    const resolved = safePath(path);
    if (!resolved) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!existsSync(resolved)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Ensure it's a file, not a directory
    const stat = statSync(resolved);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }

    // Limit file size to 1MB
    if (stat.size > 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const content = readFileSync(resolved, "utf8");
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
    // Sanitize agent_id — only allow alphanumeric and hyphens
    if (!/^[a-zA-Z0-9-]+$/.test(agent.agent_id)) continue;

    const wsDir = join(HOME, `.openclaw/workspace-${agent.agent_id}`);
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

  // Only include DB memories if explicitly requested
  const includeParam = new URL(req.url).searchParams.get("include");
  let dbMemories: any[] = [];
  if (includeParam === "lessons") {
    try {
      // Strip sensitive fields — only return content, type, agent_id, created_at
      const raw = db.prepare("SELECT agent_id, type, content, created_at FROM memories ORDER BY created_at DESC LIMIT 50").all();
      dbMemories = raw;
    } catch {}
  }

  return NextResponse.json({ files, dbMemories });
}
