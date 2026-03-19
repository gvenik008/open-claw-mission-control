import { NextRequest, NextResponse } from "next/server";
import { masterDb } from "@/lib/master-db";
import Database from "better-sqlite3";
import { existsSync } from "fs";

/**
 * Peek into any user's database.
 * GET /api/admin/peek?username=alice&table=agents
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  const table = searchParams.get("table") || "agents";

  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  const allowedTables = ["agents", "skills", "tools", "tasks", "activities", "sessions", "memories"];
  if (!allowedTables.includes(table)) {
    return NextResponse.json({ error: `Invalid table. Allowed: ${allowedTables.join(", ")}` }, { status: 400 });
  }

  // Find instance
  const instance = masterDb.prepare("SELECT * FROM instances WHERE username = ?").get(username) as any;
  if (!instance) {
    return NextResponse.json({ error: `Instance "${username}" not found` }, { status: 404 });
  }

  const dbPath = instance.db_path;
  if (!dbPath || !existsSync(dbPath)) {
    return NextResponse.json({ error: `Database not found at ${dbPath}` }, { status: 404 });
  }

  try {
    const userDb = new Database(dbPath, { readonly: true });
    const rows = userDb.prepare(`SELECT * FROM ${table} ORDER BY rowid DESC LIMIT 100`).all();
    userDb.close();

    // Parse JSON fields for agents
    const parsed = (rows as any[]).map((r: any) => {
      const result = { ...r };
      if (result.skills && typeof result.skills === "string") try { result.skills = JSON.parse(result.skills); } catch {}
      if (result.tools && typeof result.tools === "string") try { result.tools = JSON.parse(result.tools); } catch {}
      if (result.tags && typeof result.tags === "string") try { result.tags = JSON.parse(result.tags); } catch {}
      if (result.required_tools && typeof result.required_tools === "string") try { result.requiredTools = JSON.parse(result.required_tools); } catch {}
      return result;
    });

    return NextResponse.json({
      username,
      table,
      count: parsed.length,
      data: parsed,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
