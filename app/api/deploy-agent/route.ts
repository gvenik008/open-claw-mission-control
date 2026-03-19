import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";

// GET — list all agents
export async function GET() {
  const rows = db.prepare("SELECT * FROM agents ORDER BY created_at ASC").all() as any[];
  const agents = rows.map(toApiFormat);
  return NextResponse.json(agents);
}

// POST — create agent
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, agentId, role, model, skills, tools, personality, reportsTo, division } = body;

    if (!name || !agentId || !role || !model) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const stmt = db.prepare(`
      INSERT INTO agents (agent_id, name, role, type, division, lead, model, workspace, skills, tools, personality, status)
      VALUES (@agent_id, @name, @role, @type, @division, @lead, @model, @workspace, @skills, @tools, @personality, 'active')
      ON CONFLICT(agent_id) DO UPDATE SET
        name=@name, role=@role, division=@division, lead=@lead,
        model=@model, workspace=@workspace, skills=@skills, tools=@tools,
        personality=@personality, updated_at=datetime('now')
    `);

    stmt.run({
      agent_id: agentId,
      name,
      role,
      type: division ? "worker" : "standalone",
      division: division || "none",
      lead: reportsTo || "main",
      model: model.startsWith("anthropic/") ? model : `anthropic/${model}`,
      workspace: `~/.openclaw/workspace-${agentId}`,
      skills: JSON.stringify(skills || []),
      tools: JSON.stringify(tools || []),
      personality: personality || "",
    });

    // Log activity
    db.prepare("INSERT INTO activities (id, agent_id, action, detail) VALUES (?, ?, 'agent_deployed', ?)").run(
      genId(), agentId, `Agent "${name}" deployed`
    );

    const agent = db.prepare("SELECT * FROM agents WHERE agent_id = ?").get(agentId);

    return NextResponse.json({
      success: true,
      agent: toApiFormat(agent),
      message: `Agent "${name}" deployed successfully`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — update agent
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, ...updates } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }
    if (agentId === "main") {
      return NextResponse.json({ error: "Cannot modify the main orchestrator" }, { status: 400 });
    }

    const existing = db.prepare("SELECT * FROM agents WHERE agent_id = ?").get(agentId) as any;
    if (!existing) {
      return NextResponse.json({ error: `Agent "${agentId}" not found` }, { status: 404 });
    }

    const fields: string[] = [];
    const values: any = { agent_id: agentId };

    if (updates.name) { fields.push("name = @name"); values.name = updates.name; }
    if (updates.role) { fields.push("role = @role"); values.role = updates.role; }
    if (updates.division) { fields.push("division = @division"); values.division = updates.division; }
    if (updates.reportsTo !== undefined) { fields.push("lead = @lead"); values.lead = updates.reportsTo || "main"; }
    if (updates.model) {
      const m = updates.model.startsWith("anthropic/") ? updates.model : `anthropic/${updates.model}`;
      fields.push("model = @model"); values.model = m;
    }
    if (updates.personality !== undefined) { fields.push("personality = @personality"); values.personality = updates.personality; }
    if (updates.skills) { fields.push("skills = @skills"); values.skills = JSON.stringify(updates.skills); }
    if (updates.tools) { fields.push("tools = @tools"); values.tools = JSON.stringify(updates.tools); }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      db.prepare(`UPDATE agents SET ${fields.join(", ")} WHERE agent_id = @agent_id`).run(values);
    }

    // Log activity
    db.prepare("INSERT INTO activities (id, agent_id, action, detail) VALUES (?, ?, 'agent_updated', ?)").run(
      genId(), agentId, `Agent "${updates.name || existing.name}" updated`
    );

    const agent = db.prepare("SELECT * FROM agents WHERE agent_id = ?").get(agentId);
    return NextResponse.json({
      success: true,
      agent: toApiFormat(agent),
      message: `Agent "${(agent as any).name}" updated successfully`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — retire agent
export async function DELETE(req: NextRequest) {
  try {
    const { agentId } = await req.json();
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    db.prepare("UPDATE agents SET status = 'retired', updated_at = datetime('now') WHERE agent_id = ?").run(agentId);

    db.prepare("INSERT INTO activities (id, agent_id, action, detail) VALUES (?, ?, 'agent_retired', ?)").run(
      genId(), agentId, `Agent "${agentId}" retired`
    );

    return NextResponse.json({ success: true, message: `Agent "${agentId}" retired` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Transform DB row to API format ───────────────────────────────────────────

function toApiFormat(row: any) {
  if (!row) return null;
  return {
    agent_id: row.agent_id,
    name: row.name,
    role: row.role,
    type: row.type,
    division: row.division,
    lead: row.lead,
    model: row.model,
    workspace: row.workspace,
    skills: JSON.parse(row.skills || "[]"),
    tools: JSON.parse(row.tools || "[]"),
    personality: row.personality,
    created: row.created_at?.split("T")[0] || row.created_at?.split(" ")[0],
    status: row.status,
  };
}
