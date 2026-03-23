import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";

export const dynamic = "force-dynamic";

// ─── Schema migration ─────────────────────────────────────────────────────────
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS git_connections (
      id          TEXT PRIMARY KEY,
      telegram_id TEXT NOT NULL,
      platform    TEXT NOT NULL CHECK(platform IN ('github', 'gitlab')),
      username    TEXT NOT NULL,
      token       TEXT NOT NULL,
      gitlab_url  TEXT NOT NULL DEFAULT 'https://gitlab.com',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
} catch { /* table already exists */ }

// ─── Token obfuscation (base64 + reverse — NOT real encryption) ──────────────
function obfuscate(token: string): string {
  const b64 = Buffer.from(token).toString("base64");
  return b64.split("").reverse().join("");
}

function deobfuscate(obs: string): string {
  const b64 = obs.split("").reverse().join("");
  return Buffer.from(b64, "base64").toString("utf-8");
}

function maskToken(token: string): string {
  // e.g. ghp_****abcd  or  glpat-****xyz
  const raw = deobfuscate(token);
  const prefix = raw.slice(0, raw.indexOf("_") + 1) || raw.slice(0, 5);
  const suffix = raw.slice(-4);
  return `${prefix}****${suffix}`;
}

// ─── GitHub API proxy helper ──────────────────────────────────────────────────
async function githubFetch(path: string, token: string, options: RequestInit = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}

// ─── GitLab API proxy helper ──────────────────────────────────────────────────
async function gitlabFetch(path: string, token: string, baseUrl: string, options: RequestInit = {}) {
  return fetch(`${baseUrl}/api/v4${path}`, {
    ...options,
    headers: {
      "PRIVATE-TOKEN": token,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const telegramId = searchParams.get("telegramId");
  const connectionId = searchParams.get("connectionId");

  // List repos for a connection
  if (action === "repos" && connectionId) {
    const conn = db.prepare("SELECT * FROM git_connections WHERE id = ?").get(connectionId) as any;
    if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

    const token = deobfuscate(conn.token);

    try {
      if (conn.platform === "github") {
        const res = await githubFetch("/user/repos?per_page=100&sort=updated", token);
        const repos = await res.json();
        return NextResponse.json(
          repos.map((r: any) => ({
            id: r.id,
            name: r.name,
            full_name: r.full_name,
            url: r.html_url,
            private: r.private,
            description: r.description,
            updated_at: r.updated_at,
          }))
        );
      } else {
        const res = await gitlabFetch(
          "/projects?membership=true&per_page=100&order_by=last_activity_at",
          token,
          conn.gitlab_url
        );
        const projects = await res.json();
        return NextResponse.json(
          projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            full_name: p.path_with_namespace,
            url: p.web_url,
            private: p.visibility === "private",
            description: p.description,
            updated_at: p.last_activity_at,
          }))
        );
      }
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // List connections (tokens masked)
  const filter = telegramId
    ? db.prepare("SELECT * FROM git_connections WHERE telegram_id = ? ORDER BY created_at DESC").all(telegramId)
    : db.prepare("SELECT * FROM git_connections ORDER BY created_at DESC").all();

  const masked = (filter as any[]).map((c) => ({
    id: c.id,
    telegram_id: c.telegram_id,
    platform: c.platform,
    username: c.username,
    token_masked: maskToken(c.token),
    gitlab_url: c.gitlab_url,
    created_at: c.created_at,
  }));

  return NextResponse.json(masked);
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  // Create a repo via stored connection
  if (action === "create-repo") {
    try {
      const { connectionId, name, description, private: isPrivate } = await req.json();
      if (!connectionId || !name) {
        return NextResponse.json({ error: "connectionId and name are required" }, { status: 400 });
      }

      const conn = db.prepare("SELECT * FROM git_connections WHERE id = ?").get(connectionId) as any;
      if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

      const token = deobfuscate(conn.token);

      if (conn.platform === "github") {
        const res = await githubFetch("/user/repos", token, {
          method: "POST",
          body: JSON.stringify({
            name,
            description: description || "",
            private: isPrivate ?? true,
            auto_init: true,
          }),
        });
        const repo = await res.json();
        if (!res.ok) return NextResponse.json({ error: repo.message || "GitHub error" }, { status: res.status });
        return NextResponse.json({ success: true, repo: { name: repo.name, url: repo.html_url, clone_url: repo.clone_url } });
      } else {
        const res = await gitlabFetch("/projects", token, conn.gitlab_url, {
          method: "POST",
          body: JSON.stringify({
            name,
            description: description || "",
            visibility: isPrivate ? "private" : "public",
            initialize_with_readme: true,
          }),
        });
        const project = await res.json();
        if (!res.ok) return NextResponse.json({ error: project.message || "GitLab error" }, { status: res.status });
        return NextResponse.json({
          success: true,
          repo: { name: project.name, url: project.web_url, clone_url: project.http_url_to_repo },
        });
      }
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Add a connection
  try {
    const { platform, username, token, telegramId, gitlabUrl } = await req.json();
    if (!platform || !username || !token || !telegramId) {
      return NextResponse.json({ error: "platform, username, token, telegramId required" }, { status: 400 });
    }
    if (!["github", "gitlab"].includes(platform)) {
      return NextResponse.json({ error: "platform must be github or gitlab" }, { status: 400 });
    }

    const id = genId();
    const obfuscated = obfuscate(token);
    const glUrl = gitlabUrl || "https://gitlab.com";

    db.prepare(
      "INSERT INTO git_connections (id, telegram_id, platform, username, token, gitlab_url) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, telegramId, platform, username, obfuscated, glUrl);

    return NextResponse.json({
      success: true,
      connection: { id, platform, username, token_masked: maskToken(obfuscated) },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const conn = db.prepare("SELECT id FROM git_connections WHERE id = ?").get(id);
    if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

    db.prepare("DELETE FROM git_connections WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
