import { NextRequest, NextResponse } from "next/server";
import { masterDb, genId } from "@/lib/master-db";
import { execSync } from "child_process";

export async function GET() {
  const rows = masterDb.prepare("SELECT * FROM instances ORDER BY created_at DESC").all();
  // Check live status for each
  const instances = (rows as any[]).map((r) => {
    let gwAlive = false;
    let mcAlive = false;
    try { execSync(`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${r.gateway_port}/ 2>/dev/null | grep -q 200`, { timeout: 2000 }); gwAlive = true; } catch {}
    try { execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${r.mc_port}/ 2>/dev/null | grep -q 200`, { timeout: 2000 }); mcAlive = true; } catch {}
    return { ...r, bot_token: "***", api_key: "***", gwAlive, mcAlive };
  });
  return NextResponse.json(instances);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === "start") {
      const inst = masterDb.prepare("SELECT * FROM instances WHERE id = ?").get(body.id) as any;
      if (!inst) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const uid = execSync("id -u").toString().trim();
      try {
        execSync(`launchctl bootstrap gui/${uid} ~/Library/LaunchAgents/ai.openclaw.gateway.${inst.username}.plist 2>/dev/null || true`);
        execSync(`launchctl bootstrap gui/${uid} ~/Library/LaunchAgents/com.openclaw.mission-control.${inst.username}.plist 2>/dev/null || true`);
      } catch {}
      masterDb.prepare("UPDATE instances SET status = 'running', updated_at = datetime('now') WHERE id = ?").run(body.id);
      masterDb.prepare("INSERT INTO master_activity (id, instance_id, action, detail) VALUES (?, ?, 'instance_started', ?)").run(genId(), body.id, `Started ${inst.username}`);
      return NextResponse.json({ success: true });
    }
    if (body.action === "stop") {
      const inst = masterDb.prepare("SELECT * FROM instances WHERE id = ?").get(body.id) as any;
      if (!inst) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const uid = execSync("id -u").toString().trim();
      try {
        execSync(`launchctl bootout gui/${uid}/ai.openclaw.gateway.${inst.username} 2>/dev/null || true`);
        execSync(`launchctl bootout gui/${uid}/com.openclaw.mission-control.${inst.username} 2>/dev/null || true`);
      } catch {}
      masterDb.prepare("UPDATE instances SET status = 'stopped', updated_at = datetime('now') WHERE id = ?").run(body.id);
      masterDb.prepare("INSERT INTO master_activity (id, instance_id, action, detail) VALUES (?, ?, 'instance_stopped', ?)").run(genId(), body.id, `Stopped ${inst.username}`);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
