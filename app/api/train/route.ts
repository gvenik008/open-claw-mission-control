import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";

/**
 * Train an agent — update skills, personality, or add lessons.
 * 
 * POST /api/train
 * Body: {
 *   agentId: string,
 *   action: "add_skill" | "remove_skill" | "add_tool" | "remove_tool" | 
 *           "update_personality" | "add_lesson" | "set_instructions",
 *   value: string | string[],
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { agentId, action, value } = await req.json();

    if (!agentId || !action) {
      return NextResponse.json({ error: "agentId and action required" }, { status: 400 });
    }

    const agent = db.prepare("SELECT * FROM agents WHERE agent_id = ?").get(agentId) as any;
    if (!agent) {
      return NextResponse.json({ error: `Agent "${agentId}" not found` }, { status: 404 });
    }

    let message = "";

    switch (action) {
      case "add_skill": {
        const skills = JSON.parse(agent.skills || "[]");
        const toAdd = Array.isArray(value) ? value : [value];
        const added = toAdd.filter((s: string) => !skills.includes(s));
        if (added.length === 0) return NextResponse.json({ success: true, message: "Skills already present", changed: false });
        const updated = [...skills, ...added];
        db.prepare("UPDATE agents SET skills = ?, updated_at = datetime('now') WHERE agent_id = ?").run(JSON.stringify(updated), agentId);
        message = `Added ${added.length} skill(s): ${added.join(", ")}`;
        break;
      }

      case "remove_skill": {
        const skills = JSON.parse(agent.skills || "[]");
        const toRemove = Array.isArray(value) ? value : [value];
        const updated = skills.filter((s: string) => !toRemove.includes(s));
        db.prepare("UPDATE agents SET skills = ?, updated_at = datetime('now') WHERE agent_id = ?").run(JSON.stringify(updated), agentId);
        message = `Removed skill(s): ${toRemove.join(", ")}`;
        break;
      }

      case "add_tool": {
        const tools = JSON.parse(agent.tools || "[]");
        const toAdd = Array.isArray(value) ? value : [value];
        const added = toAdd.filter((t: string) => !tools.includes(t));
        if (added.length === 0) return NextResponse.json({ success: true, message: "Tools already present", changed: false });
        const updated = [...tools, ...added];
        db.prepare("UPDATE agents SET tools = ?, updated_at = datetime('now') WHERE agent_id = ?").run(JSON.stringify(updated), agentId);
        message = `Added ${added.length} tool(s): ${added.join(", ")}`;
        break;
      }

      case "remove_tool": {
        const tools = JSON.parse(agent.tools || "[]");
        const toRemove = Array.isArray(value) ? value : [value];
        const updated = tools.filter((t: string) => !toRemove.includes(t));
        db.prepare("UPDATE agents SET tools = ?, updated_at = datetime('now') WHERE agent_id = ?").run(JSON.stringify(updated), agentId);
        message = `Removed tool(s): ${toRemove.join(", ")}`;
        break;
      }

      case "update_personality": {
        db.prepare("UPDATE agents SET personality = ?, updated_at = datetime('now') WHERE agent_id = ?").run(String(value), agentId);
        message = "Personality updated";
        break;
      }

      case "append_personality": {
        const current = agent.personality || "";
        const appended = current ? `${current}\n\n${value}` : String(value);
        db.prepare("UPDATE agents SET personality = ?, updated_at = datetime('now') WHERE agent_id = ?").run(appended, agentId);
        message = "Instruction added to personality";
        break;
      }

      case "add_lesson": {
        // Store as a memory entry linked to this agent
        db.prepare(`INSERT INTO memories (id, agent_id, type, content, source) VALUES (?, ?, 'lesson', ?, 'telegram_training')`).run(
          genId(), agentId, String(value)
        );
        // Also append to personality as a reminder
        const current = agent.personality || "";
        const updated = current ? `${current}\n• ${value}` : `Lessons learned:\n• ${value}`;
        db.prepare("UPDATE agents SET personality = ?, updated_at = datetime('now') WHERE agent_id = ?").run(updated, agentId);
        message = `Lesson saved: "${String(value).slice(0, 50)}..."`;
        break;
      }

      case "set_instructions": {
        // Replace the role with new instructions
        db.prepare("UPDATE agents SET role = ?, updated_at = datetime('now') WHERE agent_id = ?").run(String(value), agentId);
        message = "Instructions updated";
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}. Use: add_skill, remove_skill, add_tool, remove_tool, update_personality, append_personality, add_lesson, set_instructions` }, { status: 400 });
    }

    // Log activity
    db.prepare("INSERT INTO activities (id, agent_id, action, detail) VALUES (?, ?, 'agent_trained', ?)").run(
      genId(), agentId, `${action}: ${message}`
    );

    // Return updated agent
    const updated = db.prepare("SELECT * FROM agents WHERE agent_id = ?").get(agentId) as any;

    return NextResponse.json({
      success: true,
      changed: true,
      message,
      agent: {
        agent_id: updated.agent_id,
        name: updated.name,
        role: updated.role,
        skills: JSON.parse(updated.skills || "[]"),
        tools: JSON.parse(updated.tools || "[]"),
        personality: updated.personality,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
