import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

export const dynamic = "force-dynamic";

const SETTINGS_FILE = join(process.cwd(), "data", "settings.json");

function loadSettings() {
  if (existsSync(SETTINGS_FILE)) {
    try {
      return JSON.parse(readFileSync(SETTINGS_FILE, "utf8"));
    } catch {}
  }
  return {
    general: { instanceName: "Mission Control", version: "0.1.0" },
    agents: { defaultModel: "anthropic/claude-sonnet-4-6", defaultTimeout: 600, autoTraining: true },
    notifications: { telegramEnabled: true, onTaskComplete: true, onError: true },
  };
}

function saveSettings(settings: any) {
  mkdirSync(dirname(SETTINGS_FILE), { recursive: true });
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export async function GET() {
  const settings = loadSettings();
  let stats = { agents: 0, tasks: 0, activities: 0, memories: 0, skills: 0, tools: 0 };
  try {
    stats = {
      agents: (db.prepare("SELECT COUNT(*) as c FROM agents WHERE status = 'active'").get() as any).c,
      tasks: (db.prepare("SELECT COUNT(*) as c FROM tasks").get() as any).c,
      activities: (db.prepare("SELECT COUNT(*) as c FROM activities").get() as any).c,
      memories: (db.prepare("SELECT COUNT(*) as c FROM memories").get() as any).c,
      skills: (db.prepare("SELECT COUNT(*) as c FROM skills").get() as any).c,
      tools: (db.prepare("SELECT COUNT(*) as c FROM tools").get() as any).c,
    };
  } catch {}
  return NextResponse.json({ settings, stats });
}

export async function PATCH(req: NextRequest) {
  const updates = await req.json();
  const current = loadSettings();
  const merged = { ...current };
  for (const [section, values] of Object.entries(updates)) {
    merged[section] = { ...(current[section] || {}), ...(values as any) };
  }
  saveSettings(merged);
  return NextResponse.json({ success: true, settings: merged });
}

export async function DELETE(req: NextRequest) {
  // Danger zone: clear test data
  try {
    db.prepare("DELETE FROM agents WHERE status = 'retired'").run();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);
    db.prepare("DELETE FROM activities WHERE created_at < ?").run(cutoff);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
