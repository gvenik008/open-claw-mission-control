import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sanitizeText, sanitizeId } from "@/lib/sanitize";

function toApiFormat(row: any) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    requiredTools: JSON.parse(row.required_tools || "[]"),
    promptAdditions: row.prompt_additions,
  };
}

export async function GET() {
  const rows = db.prepare("SELECT * FROM skills ORDER BY category, name").all();
  return NextResponse.json(rows.map(toApiFormat));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = sanitizeId(body.id);
    const name = sanitizeText(body.name);
    const category = sanitizeText(body.category);
    const description = sanitizeText(body.description || "");
    const requiredTools = body.requiredTools;
    const promptAdditions = sanitizeText(body.promptAdditions || "");
    if (!id || !name || !category) {
      return NextResponse.json({ error: "Missing required fields: id, name, category" }, { status: 400 });
    }
    db.prepare(`
      INSERT INTO skills (id, name, category, description, required_tools, prompt_additions)
      VALUES (@id, @name, @category, @description, @required_tools, @prompt_additions)
      ON CONFLICT(id) DO UPDATE SET
        name=@name, category=@category, description=@description,
        required_tools=@required_tools, prompt_additions=@prompt_additions, updated_at=datetime('now')
    `).run({
      id, name, category,
      description,
      required_tools: JSON.stringify(requiredTools || []),
      prompt_additions: promptAdditions,
    });
    const skill = db.prepare("SELECT * FROM skills WHERE id = ?").get(id);
    return NextResponse.json({ success: true, skill: toApiFormat(skill) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const existing = db.prepare("SELECT * FROM skills WHERE id = ?").get(id);
    if (!existing) return NextResponse.json({ error: `Skill "${id}" not found` }, { status: 404 });

    const fields: string[] = [];
    const values: any = { id };
    if (updates.name) { fields.push("name = @name"); values.name = updates.name; }
    if (updates.category) { fields.push("category = @category"); values.category = updates.category; }
    if (updates.description !== undefined) { fields.push("description = @description"); values.description = updates.description; }
    if (updates.requiredTools) { fields.push("required_tools = @required_tools"); values.required_tools = JSON.stringify(updates.requiredTools); }
    if (updates.promptAdditions !== undefined) { fields.push("prompt_additions = @prompt_additions"); values.prompt_additions = updates.promptAdditions; }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      db.prepare(`UPDATE skills SET ${fields.join(", ")} WHERE id = @id`).run(values);
    }
    const skill = db.prepare("SELECT * FROM skills WHERE id = ?").get(id);
    return NextResponse.json({ success: true, skill: toApiFormat(skill) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const result = db.prepare("DELETE FROM skills WHERE id = ?").run(id);
    if (result.changes === 0) return NextResponse.json({ error: `Skill "${id}" not found` }, { status: 404 });
    return NextResponse.json({ success: true, message: `Skill "${id}" removed` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
