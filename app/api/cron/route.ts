import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";

export const dynamic = "force-dynamic";

// Create a cron_jobs table if not exists
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cron_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      schedule TEXT NOT NULL,
      agent_id TEXT,
      task_description TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run TEXT,
      next_run TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
} catch {}

export async function GET() {
  const jobs = db.prepare("SELECT * FROM cron_jobs ORDER BY created_at DESC").all();
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const { name, schedule, agentId, taskDescription } = await req.json();
  if (!name || !schedule) return NextResponse.json({ error: "name and schedule required" }, { status: 400 });
  const id = genId();
  db.prepare("INSERT INTO cron_jobs (id, name, schedule, agent_id, task_description) VALUES (?, ?, ?, ?, ?)").run(id, name, schedule, agentId || null, taskDescription || "");
  const job = db.prepare("SELECT * FROM cron_jobs WHERE id = ?").get(id);
  return NextResponse.json({ success: true, job });
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const fields: string[] = [];
  const values: Record<string, any> = { id };
  if (updates.name !== undefined) { fields.push("name = @name"); values.name = updates.name; }
  if (updates.schedule !== undefined) { fields.push("schedule = @schedule"); values.schedule = updates.schedule; }
  if (updates.enabled !== undefined) { fields.push("enabled = @enabled"); values.enabled = updates.enabled ? 1 : 0; }
  if (updates.agentId !== undefined) { fields.push("agent_id = @agentId"); values.agentId = updates.agentId; }
  if (updates.taskDescription !== undefined) { fields.push("task_description = @taskDescription"); values.taskDescription = updates.taskDescription; }
  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    db.prepare(`UPDATE cron_jobs SET ${fields.join(", ")} WHERE id = @id`).run(values);
  }
  const job = db.prepare("SELECT * FROM cron_jobs WHERE id = ?").get(id);
  return NextResponse.json({ success: true, job });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  db.prepare("DELETE FROM cron_jobs WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
