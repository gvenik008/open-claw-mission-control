import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";

export const dynamic = "force-dynamic";

// Ensure telegram_id column exists (migration)
try {
  db.exec("ALTER TABLE tasks ADD COLUMN telegram_id TEXT DEFAULT NULL");
} catch { /* column already exists */ }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const assignee = searchParams.get("assignee");
  const telegramId = searchParams.get("telegramId");

  let query = "SELECT * FROM tasks WHERE 1=1";
  const params: any[] = [];

  if (status) { query += " AND status = ?"; params.push(status); }
  if (assignee) { query += " AND assignee = ?"; params.push(assignee); }
  if (telegramId) { query += " AND telegram_id = ?"; params.push(telegramId); }

  query += " ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC";

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows.map((r: any) => ({ ...r, tags: JSON.parse(r.tags || "[]") })));
}

export async function POST(req: NextRequest) {
  try {
    const { title, description, priority, assignee, dueDate, tags, telegramId } = await req.json();
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const id = genId();
    db.prepare(`
      INSERT INTO tasks (id, title, description, priority, assignee, due_date, tags, telegram_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description || "", priority || "medium", assignee || null, dueDate || null, JSON.stringify(tags || []), telegramId || null);

    // Log activity
    const creator = telegramId ? `telegram:${telegramId}` : "user";
    db.prepare("INSERT INTO activities (id, agent_id, action, detail) VALUES (?, ?, 'task_created', ?)").run(
      genId(), creator, `Task "${title}" created${telegramId ? ` by telegram:${telegramId}` : ""}`
    );

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const fields: string[] = [];
    const values: any = { id };

    if (updates.title) { fields.push("title = @title"); values.title = updates.title; }
    if (updates.description !== undefined) { fields.push("description = @description"); values.description = updates.description; }
    if (updates.status) {
      fields.push("status = @status"); values.status = updates.status;
      if (updates.status === "done") fields.push("completed_at = datetime('now')");
    }
    if (updates.priority) { fields.push("priority = @priority"); values.priority = updates.priority; }
    if (updates.assignee !== undefined) { fields.push("assignee = @assignee"); values.assignee = updates.assignee || null; }
    if (updates.dueDate !== undefined) { fields.push("due_date = @due_date"); values.due_date = updates.dueDate || null; }
    if (updates.tags) { fields.push("tags = @tags"); values.tags = JSON.stringify(updates.tags); }
    if (updates.agentSession !== undefined) { fields.push("agent_session = @agent_session"); values.agent_session = updates.agentSession; }
    if (updates.result !== undefined) { fields.push("result = @result"); values.result = updates.result; }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = @id`).run(values);
    }
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
