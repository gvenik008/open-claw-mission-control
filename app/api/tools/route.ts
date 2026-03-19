import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME || "/Users/test7";
const TOOLS_PATH = join(HOME, ".openclaw/workspace/registry/tools.json");

function loadTools() {
  try {
    return JSON.parse(readFileSync(TOOLS_PATH, "utf8"));
  } catch {
    return [];
  }
}

function saveTools(tools: any[]) {
  writeFileSync(TOOLS_PATH, JSON.stringify(tools, null, 2));
}

export async function GET() {
  return NextResponse.json(loadTools());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, category, description } = body;
    if (!id || !name) {
      return NextResponse.json(
        { error: "Missing required fields: id, name" },
        { status: 400 }
      );
    }
    const tools = loadTools();
    const existing = tools.findIndex((t: any) => t.id === id);
    const entry = {
      id,
      name,
      category: category || "Custom",
      description: description || "",
    };
    if (existing >= 0) {
      tools[existing] = entry;
    } else {
      tools.push(entry);
    }
    saveTools(tools);
    return NextResponse.json({ success: true, tool: entry });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const tools = loadTools();
    const idx = tools.findIndex((t: any) => t.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: `Tool "${id}" not found` }, { status: 404 });
    }
    Object.assign(tools[idx], updates);
    saveTools(tools);
    return NextResponse.json({ success: true, tool: tools[idx] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const tools = loadTools();
    const filtered = tools.filter((t: any) => t.id !== id);
    if (filtered.length === tools.length) {
      return NextResponse.json({ error: `Tool "${id}" not found` }, { status: 404 });
    }
    saveTools(filtered);
    return NextResponse.json({ success: true, message: `Tool "${id}" removed` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
