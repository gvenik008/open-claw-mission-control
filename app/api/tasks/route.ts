import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";

export const dynamic = "force-dynamic";

// Migrations
try { db.exec("ALTER TABLE tasks ADD COLUMN telegram_id TEXT DEFAULT NULL"); } catch {}
try { db.exec("ALTER TABLE tasks ADD COLUMN started_at TEXT DEFAULT NULL"); } catch {}
try { db.exec("ALTER TABLE tasks ADD COLUMN timeout_seconds INTEGER DEFAULT 600"); } catch {}
try { db.exec("ALTER TABLE tasks ADD COLUMN queue_position INTEGER DEFAULT NULL"); } catch {}

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
      if (updates.status === "in_progress") {
        fields.push("started_at = datetime('now')");
        // Set timeout based on task type
        const desc = (updates.description || "").toLowerCase();
        const existingTask = db.prepare("SELECT description FROM tasks WHERE id = ?").get(id) as any;
        const fullDesc = (existingTask?.description || "").toLowerCase() + " " + desc;
        const timeout = fullDesc.match(/browser|test|ui|qa|security|pentest/) ? 900 : 600;
        fields.push("timeout_seconds = @timeout_seconds"); values.timeout_seconds = timeout;
      }
      if (updates.status === "done") fields.push("completed_at = datetime('now')");
      if (updates.status === "pending") { fields.push("started_at = NULL"); }
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
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as any;

    // ─── AUTO-NOTIFY: When task moves to done, create a notification ───────────
    if (updates.status === "done" && task) {
      try {
        const agent = db.prepare("SELECT name FROM agents WHERE agent_id = ?").get(task.assignee) as any;
        const agentName = agent?.name || task.assignee || "Agent";
        db.prepare(
          "INSERT INTO notifications (id, type, title, message, link) VALUES (?, 'task_complete', ?, ?, ?)"
        ).run(
          genId(),
          `Task completed: ${task.title}`,
          `${agentName} finished: ${task.title}`,
          `/tasks`
        );
      } catch {
        // Non-fatal — notification failure should not break task update
      }
    }

    // ─── AUTO-EXECUTE: When task moves to in_progress, check agent availability ───
    if (updates.status === "in_progress" && task?.assignee) {
      const agent = db.prepare("SELECT * FROM agents WHERE agent_id = ?").get(task.assignee) as any;
      const agentName = agent?.name || task.assignee;
      
      // Check if this agent already has a task running
      const agentRunning = db.prepare(
        "SELECT COUNT(*) as c FROM tasks WHERE assignee = ? AND status = 'in_progress' AND id != ?"
      ).get(task.assignee, task.id) as any;
      
      if (agentRunning.c > 0) {
        // Agent is busy — queue this task instead of executing
        const queuePos = agentRunning.c + 1;
        db.prepare("UPDATE tasks SET queue_position = ?, updated_at = datetime('now') WHERE id = ?").run(queuePos, task.id);
        
        db.prepare("INSERT INTO activities (id, agent_id, action, detail) VALUES (?, ?, 'task_queued', ?)").run(
          genId(), task.assignee, `Task "${task.title}" queued (position ${queuePos}) — ${agentName} is busy`
        );
      } else {
        // Agent is free — execute immediately
        triggerTaskExecution(task, agentName).catch(() => {});
        
        db.prepare("INSERT INTO activities (id, agent_id, action, detail) VALUES (?, ?, 'task_auto_triggered', ?)").run(
          genId(), task.assignee, `Task "${task.title}" auto-triggered for ${agentName}`
        );
      }
    }
    
    // ─── QUEUE PROMOTION: When a task completes, start the next queued task for that agent ───
    if (updates.status === "done" && task?.assignee) {
      const nextQueued = db.prepare(
        "SELECT * FROM tasks WHERE assignee = ? AND status = 'in_progress' AND queue_position IS NOT NULL ORDER BY queue_position ASC LIMIT 1"
      ).get(task.assignee) as any;
      
      if (nextQueued) {
        const agent = db.prepare("SELECT * FROM agents WHERE agent_id = ?").get(task.assignee) as any;
        const agentName = agent?.name || task.assignee;
        
        // Clear queue position and trigger execution
        db.prepare("UPDATE tasks SET queue_position = NULL, started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(nextQueued.id);
        triggerTaskExecution(nextQueued, agentName).catch(() => {});
        
        // Reorder remaining queue
        const remaining = db.prepare(
          "SELECT id FROM tasks WHERE assignee = ? AND status = 'in_progress' AND queue_position IS NOT NULL ORDER BY queue_position ASC"
        ).all(task.assignee) as any[];
        remaining.forEach((r: any, i: number) => {
          db.prepare("UPDATE tasks SET queue_position = ? WHERE id = ?").run(i + 1, r.id);
        });
        
        db.prepare("INSERT INTO activities (id, agent_id, action, detail) VALUES (?, ?, 'task_queue_promoted', ?)").run(
          genId(), task.assignee, `Task "${nextQueued.title}" promoted from queue — ${agentName} is now free`
        );
      }
    }

    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Trigger task execution via OpenClaw gateway wake event ───────────────────

async function triggerTaskExecution(task: any, agentName: string) {
  try {
    const { readFileSync, writeFileSync } = await import("fs");
    const { join } = await import("path");
    
    // Always write trigger file — this is the reliable mechanism
    const triggerPath = join(process.env.HOME || "", ".openclaw", "workspace", "task-triggers.json");
    let triggers: any[] = [];
    try { triggers = JSON.parse(readFileSync(triggerPath, "utf8")); } catch {}
    
    // Don't duplicate — check if this task is already triggered
    if (triggers.some((t: any) => t.taskId === task.id)) return;
    
    triggers.push({
      taskId: task.id,
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      agentName,
      priority: task.priority,
      timeoutSeconds: task.description?.toLowerCase().match(/browser|test|ui|qa|security/) ? 900 : 600,
      triggeredAt: new Date().toISOString(),
    });
    writeFileSync(triggerPath, JSON.stringify(triggers, null, 2));
  } catch {
    // Silent fail
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
