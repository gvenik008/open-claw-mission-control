import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const totalAgents = (db.prepare("SELECT COUNT(*) as c FROM agents WHERE status = 'active'").get() as any).c;
    const totalTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks").get() as any).c;
    const completedTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'done'").get() as any).c;
    const pendingTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'pending'").get() as any).c;
    const inProgressTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'in_progress'").get() as any).c;

    const dailyActivity = db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as count 
      FROM activities 
      WHERE created_at > datetime('now', '-7 days')
      GROUP BY date(created_at) 
      ORDER BY day ASC
    `).all();

    const agentActivity = db.prepare(`
      SELECT a.agent_id, ag.name as agent_name, COUNT(*) as count, 
             MAX(a.created_at) as last_active
      FROM activities a
      LEFT JOIN agents ag ON a.agent_id = ag.agent_id
      GROUP BY a.agent_id
      ORDER BY count DESC
    `).all();

    const agentTasks = db.prepare(`
      SELECT assignee, COUNT(*) as total,
             SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed
      FROM tasks 
      WHERE assignee IS NOT NULL
      GROUP BY assignee
    `).all();

    const activityTypes = db.prepare(`
      SELECT action, COUNT(*) as count 
      FROM activities 
      GROUP BY action 
      ORDER BY count DESC
    `).all();

    const recentIssues = db.prepare(`
      SELECT * FROM activities 
      WHERE action LIKE '%error%' OR action LIKE '%timeout%' OR action LIKE '%fail%'
      ORDER BY created_at DESC LIMIT 10
    `).all();

    return NextResponse.json({
      summary: { totalAgents, totalTasks, completedTasks, pendingTasks, inProgressTasks },
      dailyActivity,
      agentActivity,
      agentTasks,
      activityTypes,
      recentIssues,
    });
  } catch (error) {
    return NextResponse.json({
      summary: { totalAgents: 0, totalTasks: 0, completedTasks: 0, pendingTasks: 0, inProgressTasks: 0 },
      dailyActivity: [],
      agentActivity: [],
      agentTasks: [],
      activityTypes: [],
      recentIssues: [],
    });
  }
}
