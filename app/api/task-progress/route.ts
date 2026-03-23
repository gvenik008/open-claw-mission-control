import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface TaskProgress {
  id: string;
  title: string;
  assignee: string;
  agentName: string;
  priority: string;
  startedAt: string | null;
  timeoutSeconds: number;
  elapsedSeconds: number;
  progressPercent: number;
  status: "running" | "near_complete" | "overtime";
  estimatedRemaining: string;
}

export async function GET() {
  try {
    // Get all in_progress tasks
    const tasks = db.prepare(`
      SELECT t.*, a.name as agent_name 
      FROM tasks t 
      LEFT JOIN agents a ON t.assignee = a.agent_id 
      WHERE t.status = 'in_progress'
      ORDER BY t.started_at ASC
    `).all() as any[];

    const now = Date.now();
    
    const progress: TaskProgress[] = tasks.map((t) => {
      const startedAt = t.started_at ? new Date(t.started_at.replace(" ", "T") + "Z").getTime() : now;
      const timeoutMs = (t.timeout_seconds || 600) * 1000;
      const elapsed = now - startedAt;
      const elapsedSeconds = Math.floor(elapsed / 1000);
      const progressPercent = Math.min(Math.round((elapsed / timeoutMs) * 100), 100);
      
      let status: "running" | "near_complete" | "overtime" = "running";
      if (progressPercent >= 100) status = "overtime";
      else if (progressPercent >= 80) status = "near_complete";

      const remaining = Math.max(0, (t.timeout_seconds || 600) - elapsedSeconds);
      let estimatedRemaining = "";
      if (remaining > 60) estimatedRemaining = `${Math.floor(remaining / 60)}m ${remaining % 60}s`;
      else estimatedRemaining = `${remaining}s`;

      return {
        id: t.id,
        title: t.title,
        assignee: t.assignee || "unassigned",
        agentName: t.agent_name || t.assignee || "Unknown",
        priority: t.priority,
        startedAt: t.started_at,
        timeoutSeconds: t.timeout_seconds || 600,
        elapsedSeconds,
        progressPercent,
        status,
        estimatedRemaining,
      };
    });

    // Also get agent-level summary
    const agentProgress: Record<string, { agentId: string; agentName: string; tasks: TaskProgress[] }> = {};
    for (const p of progress) {
      if (!agentProgress[p.assignee]) {
        agentProgress[p.assignee] = { agentId: p.assignee, agentName: p.agentName, tasks: [] };
      }
      agentProgress[p.assignee].tasks.push(p);
    }

    return NextResponse.json({ 
      tasks: progress, 
      agents: Object.values(agentProgress),
      total: progress.length,
    });
  } catch (err: any) {
    return NextResponse.json({ tasks: [], agents: [], total: 0 });
  }
}
