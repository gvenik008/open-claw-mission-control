import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const agentId = searchParams.get("agent_id");

  let rows;
  if (agentId) {
    rows = db.prepare("SELECT * FROM activities WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?").all(agentId, limit);
  } else {
    rows = db.prepare("SELECT * FROM activities ORDER BY created_at DESC LIMIT ?").all(limit);
  }
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, action, detail, metadata } = await req.json();
    if (!agentId || !action) {
      return NextResponse.json({ error: "agentId and action required" }, { status: 400 });
    }
    const id = genId();
    db.prepare("INSERT INTO activities (id, agent_id, action, detail, metadata) VALUES (?, ?, ?, ?, ?)").run(
      id, agentId, action, detail || "", JSON.stringify(metadata || {})
    );
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
