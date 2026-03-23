import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";

export const dynamic = "force-dynamic";

// ─── Auto-migration ───────────────────────────────────────────────────────────
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id         TEXT PRIMARY KEY,
      type       TEXT NOT NULL DEFAULT 'info',
      title      TEXT NOT NULL,
      message    TEXT NOT NULL DEFAULT '',
      link       TEXT DEFAULT NULL,
      read       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)`);
} catch {
  // Table already exists — no-op
}

// ─── GET /api/notifications ───────────────────────────────────────────────────
// Query params:
//   ?unread=true  — only unread notifications
// Response: { notifications: [...], unreadCount: N }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const query = unreadOnly
      ? "SELECT * FROM notifications WHERE read = 0 ORDER BY created_at DESC LIMIT 50"
      : "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50";

    const notifications = db.prepare(query).all();

    const unreadCount = (
      db.prepare("SELECT COUNT(*) as count FROM notifications WHERE read = 0").get() as { count: number }
    ).count;

    return NextResponse.json({ notifications, unreadCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST /api/notifications ──────────────────────────────────────────────────
// Body: { type?, title, message?, link? }

export async function POST(req: NextRequest) {
  try {
    const { type, title, message, link } = await req.json();

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const validTypes = ["task_complete", "agent_error", "report_saved", "system", "info"];
    const notifType = validTypes.includes(type) ? type : "info";

    const id = genId();
    db.prepare(`
      INSERT INTO notifications (id, type, title, message, link)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      notifType,
      title.trim(),
      typeof message === "string" ? message.trim() : "",
      typeof link === "string" && link.trim() ? link.trim() : null
    );

    const notification = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
    return NextResponse.json({ success: true, notification }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH /api/notifications ─────────────────────────────────────────────────
// Body: { id: string } — mark single notification as read
//    or { markAllRead: true } — mark all as read

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.markAllRead === true) {
      const result = db.prepare("UPDATE notifications SET read = 1 WHERE read = 0").run();
      return NextResponse.json({ success: true, updated: result.changes });
    }

    const { id } = body;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id or markAllRead is required" }, { status: 400 });
    }

    const existing = db.prepare("SELECT id FROM notifications WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id);
    const notification = db.prepare("SELECT * FROM notifications WHERE id = ?").get(id);
    return NextResponse.json({ success: true, notification });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE /api/notifications ────────────────────────────────────────────────
// Clears all read notifications

export async function DELETE(_req: NextRequest) {
  try {
    const result = db.prepare("DELETE FROM notifications WHERE read = 1").run();
    return NextResponse.json({ success: true, deleted: result.changes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
