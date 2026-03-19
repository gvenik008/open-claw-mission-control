import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";

/**
 * Connection types:
 * - reports_to: hierarchy (solid line, one per agent as target)
 * - synced: bidirectional collaboration (dashed line, many-to-many)
 * - delegates: one-way task delegation (dotted line)
 */

export async function GET() {
  const rows = db.prepare("SELECT * FROM connections ORDER BY created_at ASC").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const { sourceId, targetId, type, label } = await req.json();
    if (!sourceId || !targetId) {
      return NextResponse.json({ error: "sourceId and targetId required" }, { status: 400 });
    }
    if (sourceId === targetId) {
      return NextResponse.json({ error: "Cannot connect agent to itself" }, { status: 400 });
    }

    const connType = type || "synced";
    const validTypes = ["reports_to", "synced", "delegates"];
    if (!validTypes.includes(connType)) {
      return NextResponse.json({ error: `Invalid type. Use: ${validTypes.join(", ")}` }, { status: 400 });
    }

    // For reports_to: remove any existing reports_to for this target
    if (connType === "reports_to") {
      db.prepare("DELETE FROM connections WHERE target_id = ? AND type = 'reports_to'").run(targetId);
      // Also update the agent's lead field
      db.prepare("UPDATE agents SET lead = ?, updated_at = datetime('now') WHERE agent_id = ?").run(sourceId, targetId);
    }

    // For synced: create bidirectional (check both directions)
    const id = genId();
    db.prepare(`
      INSERT OR IGNORE INTO connections (id, source_id, target_id, type, label)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, sourceId, targetId, connType, label || "");

    // Log activity
    db.prepare("INSERT INTO activities (id, agent_id, action, detail) VALUES (?, ?, 'connection_created', ?)").run(
      genId(), sourceId, `${connType}: ${sourceId} → ${targetId}${label ? ` (${label})` : ""}`
    );

    return NextResponse.json({ success: true, id, type: connType });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id, sourceId, targetId, type } = await req.json();

    if (id) {
      // Get connection info before deleting for lead reset
      const conn = db.prepare("SELECT * FROM connections WHERE id = ?").get(id) as any;
      if (conn && conn.type === "reports_to") {
        db.prepare("UPDATE agents SET lead = 'main', updated_at = datetime('now') WHERE agent_id = ?").run(conn.target_id);
      }
      db.prepare("DELETE FROM connections WHERE id = ?").run(id);
    } else if (sourceId && targetId) {
      const connType = type || "synced";
      const conn = db.prepare("SELECT * FROM connections WHERE source_id = ? AND target_id = ? AND type = ?").get(sourceId, targetId, connType) as any;
      if (conn && conn.type === "reports_to") {
        db.prepare("UPDATE agents SET lead = 'main', updated_at = datetime('now') WHERE agent_id = ?").run(targetId);
      }
      db.prepare("DELETE FROM connections WHERE source_id = ? AND target_id = ? AND type = ?").run(sourceId, targetId, connType);
      // Also delete reverse for synced
      if (connType === "synced") {
        db.prepare("DELETE FROM connections WHERE source_id = ? AND target_id = ? AND type = 'synced'").run(targetId, sourceId);
      }
    } else {
      return NextResponse.json({ error: "id or sourceId+targetId required" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
