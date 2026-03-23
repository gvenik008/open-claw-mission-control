import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const TRIGGER_PATH = join(process.env.HOME || "", ".openclaw", "workspace", "task-triggers.json");
const MAX_CONCURRENT = 3;

// ─── GET /api/tasks/execute ─────────────────────────────────────────────────
// Returns list of currently executing tasks with elapsed time

export async function GET(_req: NextRequest) {
  try {
    const rows = db
      .prepare(
        `SELECT t.*, a.name as agent_name
         FROM tasks t
         LEFT JOIN agents a ON t.assignee = a.agent_id
         WHERE t.status = 'in_progress'
         ORDER BY t.started_at ASC`
      )
      .all() as any[];

    const now = Date.now();
    const executing = rows.map((row: any) => {
      const startedAt = row.started_at ? new Date(row.started_at + "Z").getTime() : now;
      const elapsedSeconds = Math.floor((now - startedAt) / 1000);
      const timeoutSeconds = row.timeout_seconds || 600;
      return {
        taskId: row.id,
        title: row.title,
        assignee: row.assignee,
        agentName: row.agent_name || row.assignee,
        status: row.status,
        startedAt: row.started_at,
        elapsedSeconds,
        timeoutSeconds,
        remainingSeconds: Math.max(0, timeoutSeconds - elapsedSeconds),
        priority: row.priority,
      };
    });

    return NextResponse.json({ executing, count: executing.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST /api/tasks/execute ────────────────────────────────────────────────
// Body: { taskId: string }
// Triggers agent execution for the given task

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    // 1. Validate task exists
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as any;
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 2. Validate status is pending or review
    if (!["pending", "review"].includes(task.status)) {
      return NextResponse.json(
        {
          error: `Task cannot be executed — current status is "${task.status}". Must be pending or review.`,
          currentStatus: task.status,
        },
        { status: 422 }
      );
    }

    // 3. Validate task has an assignee
    if (!task.assignee) {
      return NextResponse.json(
        { error: "Task has no assignee. Assign an agent before executing." },
        { status: 422 }
      );
    }

    // 4. Check concurrent limit (max 3 in_progress)
    const inProgressCount = (
      db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE status = 'in_progress'").get() as any
    ).cnt;

    if (inProgressCount >= MAX_CONCURRENT) {
      return NextResponse.json(
        {
          error: `Concurrent execution limit reached (${MAX_CONCURRENT}). Wait for a running task to finish.`,
          activeCount: inProgressCount,
          limit: MAX_CONCURRENT,
        },
        { status: 429 }
      );
    }

    // 5. Resolve agent info
    const agent = db.prepare("SELECT * FROM agents WHERE agent_id = ?").get(task.assignee) as any;
    const agentName = agent?.name || task.assignee;

    // 6. Determine timeout based on description content
    const descLower = (task.description || "").toLowerCase();
    const timeoutSeconds = descLower.match(/browser|test|ui|qa|security|pentest|crawl|scrape/)
      ? 900
      : descLower.match(/comprehensive|multi-agent|full|complete|deep/)
      ? 1200
      : 600;

    // 7. PATCH task to in_progress with started_at + timeout
    db.prepare(
      `UPDATE tasks
       SET status = 'in_progress',
           started_at = datetime('now'),
           timeout_seconds = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(timeoutSeconds, taskId);

    // 8. Write trigger to task-triggers.json
    let triggers: any[] = [];
    try {
      triggers = JSON.parse(readFileSync(TRIGGER_PATH, "utf8"));
    } catch {
      // File may not exist yet — start fresh
    }

    // Remove any stale trigger for the same task
    triggers = triggers.filter((t: any) => t.taskId !== taskId);

    triggers.push({
      taskId,
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      agentName,
      priority: task.priority,
      telegramId: task.telegram_id || null,
      timeoutSeconds,
      triggeredAt: new Date().toISOString(),
    });

    writeFileSync(TRIGGER_PATH, JSON.stringify(triggers, null, 2));

    // 9. Log activity
    db.prepare(
      "INSERT INTO activities (id, agent_id, action, detail) VALUES (?, ?, 'task_execution_requested', ?)"
    ).run(
      genId(),
      task.assignee,
      `Task "${task.title}" execution requested — assigned to ${agentName}`
    );

    // 10. Return result
    const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as any;

    return NextResponse.json({
      success: true,
      taskId,
      agentName,
      status: "executing",
      timeoutSeconds,
      task: updatedTask,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
