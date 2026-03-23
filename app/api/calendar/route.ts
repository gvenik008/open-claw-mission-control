import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { readFileSync, existsSync } from "fs";

export async function GET() {
  let scheduledTasks: any[] = [];
  let recentTasks: any[] = [];

  try {
    scheduledTasks = db.prepare("SELECT * FROM tasks WHERE due_date IS NOT NULL ORDER BY due_date ASC").all();
    recentTasks = db.prepare("SELECT * FROM tasks ORDER BY updated_at DESC LIMIT 20").all();
  } catch {}

  let cronJobs: any[] = [];
  const configPath = (process.env.HOME || "") + "/.openclaw/config.yaml";
  if (existsSync(configPath)) {
    try {
      const config = readFileSync(configPath, "utf8");
      // Extract cron-like lines
      const cronLines = config
        .split("\n")
        .filter((l) => l.includes("cron") || l.includes("schedule") || l.match(/\d+\s+\*\s+\*/));
      cronJobs = cronLines.map((line, i) => ({ id: i, raw: line.trim(), note: "From gateway config" }));
      if (cronJobs.length === 0) {
        cronJobs = [{ id: 0, raw: "See gateway config", note: "Cron jobs managed via OpenClaw gateway" }];
      }
    } catch {}
  }

  return NextResponse.json({ scheduledTasks, recentTasks, cronJobs });
}
