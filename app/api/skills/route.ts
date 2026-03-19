import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME || "/Users/test7";
const SKILLS_PATH = join(HOME, ".openclaw/workspace/registry/skills.json");

function loadSkills() {
  try {
    return JSON.parse(readFileSync(SKILLS_PATH, "utf8"));
  } catch {
    return [];
  }
}

function saveSkills(skills: any[]) {
  writeFileSync(SKILLS_PATH, JSON.stringify(skills, null, 2));
}

export async function GET() {
  return NextResponse.json(loadSkills());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, category, description, requiredTools, promptAdditions } = body;
    if (!id || !name || !category) {
      return NextResponse.json(
        { error: "Missing required fields: id, name, category" },
        { status: 400 }
      );
    }
    const skills = loadSkills();
    const existing = skills.findIndex((s: any) => s.id === id);
    const entry = {
      id,
      name,
      category,
      description: description || "",
      requiredTools: requiredTools || [],
      promptAdditions: promptAdditions || "",
    };
    if (existing >= 0) {
      skills[existing] = entry;
    } else {
      skills.push(entry);
    }
    saveSkills(skills);
    return NextResponse.json({ success: true, skill: entry });
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
    const skills = loadSkills();
    const idx = skills.findIndex((s: any) => s.id === id);
    if (idx < 0) {
      return NextResponse.json({ error: `Skill "${id}" not found` }, { status: 404 });
    }
    Object.assign(skills[idx], updates);
    saveSkills(skills);
    return NextResponse.json({ success: true, skill: skills[idx] });
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
    const skills = loadSkills();
    const filtered = skills.filter((s: any) => s.id !== id);
    if (filtered.length === skills.length) {
      return NextResponse.json({ error: `Skill "${id}" not found` }, { status: 404 });
    }
    saveSkills(filtered);
    return NextResponse.json({ success: true, message: `Skill "${id}" removed` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
