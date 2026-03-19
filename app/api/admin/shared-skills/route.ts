import { NextRequest, NextResponse } from "next/server";
import { masterDb } from "@/lib/master-db";

export async function GET() {
  const rows = masterDb.prepare("SELECT * FROM shared_skills ORDER BY category, name").all();
  return NextResponse.json((rows as any[]).map((r) => ({
    ...r, requiredTools: JSON.parse(r.required_tools || "[]"), promptAdditions: r.prompt_additions,
  })));
}

export async function POST(req: NextRequest) {
  const { id, name, category, description, requiredTools, promptAdditions } = await req.json();
  if (!id || !name || !category) return NextResponse.json({ error: "id, name, category required" }, { status: 400 });
  masterDb.prepare(`
    INSERT INTO shared_skills (id, name, category, description, required_tools, prompt_additions)
    VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, category=excluded.category,
    description=excluded.description, required_tools=excluded.required_tools, prompt_additions=excluded.prompt_additions, updated_at=datetime('now')
  `).run(id, name, category, description || "", JSON.stringify(requiredTools || []), promptAdditions || "");
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  masterDb.prepare("DELETE FROM shared_skills WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
