import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, appendFileSync } from "fs";
import { join, resolve, normalize, dirname } from "path";

export const dynamic = "force-dynamic";

const HOME = process.env.HOME || "";
const WORKSPACE = join(HOME, ".openclaw", "workspace");
const OPENCLAW_ROOT = join(HOME, ".openclaw");

const ALLOWED_EXT = new Set([".md", ".json", ".yaml", ".yml", ".txt"]);

function safePath(requestedPath: string): string | null {
  if (requestedPath.includes("\0")) return null;
  let decoded;
  try { decoded = decodeURIComponent(requestedPath); } catch { return null; }
  if (decoded.includes("\0")) return null;

  let fullPath;
  if (decoded.startsWith("../workspace-")) {
    fullPath = resolve(OPENCLAW_ROOT, decoded.replace(/^\.\.\//, ""));
  } else {
    fullPath = resolve(WORKSPACE, decoded);
  }

  const normalized = normalize(fullPath);
  const isUnderMain = normalized.startsWith(WORKSPACE + "/") || normalized === WORKSPACE;
  const isUnderAgent = normalized.startsWith(OPENCLAW_ROOT + "/workspace-");
  if (!isUnderMain && !isUnderAgent) return null;

  const ext = normalized.slice(normalized.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return null;

  return normalized;
}

export async function POST(req: NextRequest) {
  try {
    const { path, content, append } = await req.json();
    if (!path || content === undefined) {
      return NextResponse.json({ error: "path and content required" }, { status: 400 });
    }

    const resolved = safePath(path);
    if (!resolved) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Ensure directory exists
    mkdirSync(dirname(resolved), { recursive: true });

    if (append) {
      appendFileSync(resolved, "\n" + content, "utf8");
    } else {
      writeFileSync(resolved, content, "utf8");
    }

    return NextResponse.json({ success: true, path });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
