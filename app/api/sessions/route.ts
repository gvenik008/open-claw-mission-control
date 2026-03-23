import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const dbSessions = db.prepare("SELECT * FROM sessions ORDER BY started_at DESC LIMIT 50").all();

    const recentRuns = db.prepare(`
      SELECT agent_id, action, detail, created_at 
      FROM activities 
      WHERE action IN ('task_started', 'task_completed', 'agent_trained', 'agent_deployed', 'skills_auto_assigned')
      ORDER BY created_at DESC LIMIT 30
    `).all();

    return NextResponse.json({ sessions: dbSessions, recentRuns });
  } catch (error) {
    return NextResponse.json({ sessions: [], recentRuns: [] });
  }
}
