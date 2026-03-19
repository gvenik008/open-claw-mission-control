import { NextRequest, NextResponse } from "next/server";
import { masterDb } from "@/lib/master-db";

export async function GET() {
  return NextResponse.json(masterDb.prepare("SELECT * FROM shared_tools ORDER BY category, name").all());
}

export async function POST(req: NextRequest) {
  const { id, name, category, description } = await req.json();
  if (!id || !name) return NextResponse.json({ error: "id, name required" }, { status: 400 });
  masterDb.prepare(`
    INSERT INTO shared_tools (id, name, category, description) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category, description=excluded.description, updated_at=datetime('now')
  `).run(id, name, category || "Custom", description || "");
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  masterDb.prepare("DELETE FROM shared_tools WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
