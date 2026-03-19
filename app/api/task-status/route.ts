import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";

/**
 * Quick task status update endpoint.
 * Designed to be called by Gvenik during agent orchestration.
 *
 * PATCH /api/task-status
 * Body: {
 *   taskId: string,
 *   status: "pending" | "in_progress" | "review" | "done" | "failed",
 *   result?: string,       // final result text (for done)
 *   agentSession?: string, // session key of the working agent
 * }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { taskId, status, result, agentSession } = await req.json();

    if (!taskId || !status) {
      return NextResponse.json({ error: "taskId and status required" }, { status: 400 });
    }

    const validStatuses = ["pending", "in_progress", "review", "done", "failed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Use: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as any;
    if (!task) {
      return NextResponse.json({ error: `Task "${taskId}" not found` }, { status: 404 });
    }

    const updates: string[] = ["status = ?", "updated_at = datetime('now')"];
    const params: any[] = [status];

    if (status === "done" || status === "failed") {
      updates.push("completed_at = datetime('now')");
    }

    if (result !== undefined) {
      updates.push("result = ?");
      params.push(result);
    }

    if (agentSession !== undefined) {
      updates.push("agent_session = ?");
      params.push(agentSession);
    }

    params.push(taskId);
    db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...params);

    // Log activity
    const statusEmoji: Record<string, string> = {
      pending: "⏳", in_progress: "🔄", review: "👀", done: "✅", failed: "❌", cancelled: "🚫"
    };
    db.prepare("INSERT INTO activities (id, agent_id, action, detail) VALUES (?, ?, 'task_status_changed', ?)").run(
      genId(),
      task.assignee || "system",
      `${statusEmoji[status] || "📋"} "${task.title}" → ${status}${result ? " — " + result.slice(0, 100) : ""}`
    );

    return NextResponse.json({
      success: true,
      taskId,
      previousStatus: task.status,
      newStatus: status,
      title: task.title,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Get task by ID with full details.
 * GET /api/task-status?id=xxx
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as any;
  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...task,
    tags: JSON.parse(task.tags || "[]"),
  });
}
