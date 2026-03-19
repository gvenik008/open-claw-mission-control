import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const rows = db.prepare("SELECT * FROM tools ORDER BY category, name").all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const { id, name, category, description } = await req.json();
    if (!id || !name) {
      return NextResponse.json({ error: "Missing required fields: id, name" }, { status: 400 });
    }
    db.prepare(`
      INSERT INTO tools (id, name, category, description)
      VALUES (@id, @name, @category, @description)
      ON CONFLICT(id) DO UPDATE SET
        name=@name, category=@category, description=@description, updated_at=datetime('now')
    `).run({ id, name, category: category || "Custom", description: description || "" });
    const tool = db.prepare("SELECT * FROM tools WHERE id = ?").get(id);
    return NextResponse.json({ success: true, tool });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const existing = db.prepare("SELECT * FROM tools WHERE id = ?").get(id);
    if (!existing) return NextResponse.json({ error: `Tool "${id}" not found` }, { status: 404 });

    const fields: string[] = [];
    const values: any = { id };
    if (updates.name) { fields.push("name = @name"); values.name = updates.name; }
    if (updates.category) { fields.push("category = @category"); values.category = updates.category; }
    if (updates.description !== undefined) { fields.push("description = @description"); values.description = updates.description; }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      db.prepare(`UPDATE tools SET ${fields.join(", ")} WHERE id = @id`).run(values);
    }
    const tool = db.prepare("SELECT * FROM tools WHERE id = ?").get(id);
    return NextResponse.json({ success: true, tool });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const result = db.prepare("DELETE FROM tools WHERE id = ?").run(id);
    if (result.changes === 0) return NextResponse.json({ error: `Tool "${id}" not found` }, { status: 404 });
    return NextResponse.json({ success: true, message: `Tool "${id}" removed` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
