import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME || "/Users/test7";
const OPENCLAW_DIR = join(HOME, ".openclaw");
const CONFIG_PATH = join(OPENCLAW_DIR, "openclaw.json");
const REGISTRY_PATH = join(HOME, ".openclaw/workspace/registry/agents.json");
const SKILLS_PATH = join(HOME, ".openclaw/workspace/registry/skills.json");

interface AgentRequest {
  name: string;
  agentId: string;
  role: string;
  model: string;
  skills: string[];
  tools: string[];
  personality: string;
  reportsTo: string;
  division: string;
}

function writeSoulMd(workspacePath: string, agent: any, skillPrompts: string) {
  const soulContent = `# ${agent.name} — ${agent.role}

## Identity
You are ${agent.name}, a specialized AI agent. Your role: ${agent.role}.
You report to: ${agent.reportsTo || "Gvenik (main orchestrator)"}.
Division: ${agent.division || "independent"}.

## Personality
${agent.personality || "Professional, thorough, and detail-oriented."}

## Skills & Expertise
${skillPrompts}

## Core Workflow
1. Receive task assignment
2. Plan your approach
3. Execute systematically
4. Document all findings/output in your workspace
5. Report results back to your lead

## File Ownership
- WRITES TO: output/, memory/
- READS FROM: skills/, any files relevant to your task

## Rules
- Always document your work
- Report blockers immediately
- Never operate outside your assigned scope without confirmation
- Follow the communication chain: report to ${agent.reportsTo || "Gvenik"}
`;
  writeFileSync(join(workspacePath, "SOUL.md"), soulContent);
}

export async function POST(req: NextRequest) {
  try {
    const body: AgentRequest = await req.json();
    const { name, agentId, role, model, skills, tools, personality, reportsTo, division } = body;

    if (!name || !agentId || !role || !model) {
      return NextResponse.json({ error: "Missing required fields: name, agentId, role, model" }, { status: 400 });
    }

    // 1. Backup config
    const timestamp = Math.floor(Date.now() / 1000);
    copyFileSync(CONFIG_PATH, `${CONFIG_PATH}.backup-${timestamp}`);

    // 2. Create workspace
    const workspacePath = join(OPENCLAW_DIR, `workspace-${agentId}`);
    mkdirSync(join(workspacePath, "memory"), { recursive: true });
    mkdirSync(join(workspacePath, "skills"), { recursive: true });
    mkdirSync(join(workspacePath, "output"), { recursive: true });

    // 3. Load skills data for SOUL.md generation
    const allSkills = JSON.parse(readFileSync(SKILLS_PATH, "utf8"));
    const selectedSkills = allSkills.filter((s: any) => skills.includes(s.id));
    const skillPrompts = selectedSkills.map((s: any) => s.promptAdditions).join("\n\n");

    // 4. Write SOUL.md
    writeSoulMd(workspacePath, body, skillPrompts);

    // 5. Write AGENTS.md
    const agentsContent = `# ${name}\n\n- **ID:** ${agentId}\n- **Role:** ${role}\n- **Model:** ${model}\n- **Division:** ${division || "independent"}\n- **Reports to:** ${reportsTo || "Gvenik"}\n- **Skills:** ${skills.join(", ")}\n- **Tools:** ${tools.join(", ")}\n- **Created:** ${new Date().toISOString().split("T")[0]}\n`;
    writeFileSync(join(workspacePath, "AGENTS.md"), agentsContent);

    // 6. Update registry
    const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
    const existing = registry.findIndex((a: any) => a.agent_id === agentId);
    const agentEntry = {
      agent_id: agentId,
      name,
      role,
      type: division ? "worker" : "standalone",
      division: division || "none",
      lead: reportsTo || "main",
      model: `anthropic/${model}`,
      workspace: `~/.openclaw/workspace-${agentId}`,
      skills,
      tools,
      personality,
      created: new Date().toISOString().split("T")[0],
      status: "active",
    };
    if (existing >= 0) {
      registry[existing] = agentEntry;
    } else {
      registry.push(agentEntry);
    }
    writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));

    // 7. Update openclaw.json
    const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    if (!config.agents.list.find((a: any) => a.id === agentId)) {
      config.agents.list.push({
        id: agentId,
        workspace: workspacePath,
        model: { primary: `anthropic/${model}` },
      });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    // 8. Restart gateway (best effort, non-blocking)
    try {
      const { exec } = require("child_process");
      exec("openclaw gateway restart", { timeout: 15000 });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      agent: agentEntry,
      workspace: workspacePath,
      message: `Agent "${name}" deployed successfully`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
    return NextResponse.json(registry);
  } catch {
    return NextResponse.json([]);
  }
}

// PATCH — Update agent (rename, change role, skills, tools, personality, model)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, ...updates } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }
    if (agentId === "main") {
      return NextResponse.json({ error: "Cannot modify the main orchestrator agent" }, { status: 400 });
    }

    // Update registry
    const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
    const idx = registry.findIndex((a: any) => a.agent_id === agentId);
    if (idx < 0) {
      return NextResponse.json({ error: `Agent "${agentId}" not found` }, { status: 404 });
    }

    const agent = registry[idx];

    // Apply updates
    if (updates.name) agent.name = updates.name;
    if (updates.role) agent.role = updates.role;
    if (updates.skills) agent.skills = updates.skills;
    if (updates.tools) agent.tools = updates.tools;
    if (updates.personality) agent.personality = updates.personality;
    if (updates.division) agent.division = updates.division;
    if (updates.reportsTo) agent.lead = updates.reportsTo;
    if (updates.model) {
      agent.model = updates.model.startsWith("anthropic/") ? updates.model : `anthropic/${updates.model}`;
    }

    registry[idx] = agent;
    writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));

    // Regenerate SOUL.md
    const workspacePath = join(OPENCLAW_DIR, `workspace-${agentId}`);
    if (existsSync(workspacePath)) {
      const allSkills = JSON.parse(readFileSync(SKILLS_PATH, "utf8"));
      const selectedSkills = allSkills.filter((s: any) => (agent.skills || []).includes(s.id));
      const skillPrompts = selectedSkills.map((s: any) => s.promptAdditions).join("\n\n");
      writeSoulMd(workspacePath, {
        name: agent.name,
        role: agent.role,
        personality: agent.personality || "",
        reportsTo: agent.lead,
        division: agent.division,
      }, skillPrompts);

      // Update AGENTS.md
      const agentsContent = `# ${agent.name}\n\n- **ID:** ${agentId}\n- **Role:** ${agent.role}\n- **Model:** ${agent.model}\n- **Division:** ${agent.division || "independent"}\n- **Reports to:** ${agent.lead || "Gvenik"}\n- **Skills:** ${(agent.skills || []).join(", ")}\n- **Tools:** ${(agent.tools || []).join(", ")}\n- **Created:** ${agent.created}\n`;
      writeFileSync(join(workspacePath, "AGENTS.md"), agentsContent);
    }

    // Update model in openclaw.json if changed
    if (updates.model) {
      const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
      const configAgent = config.agents.list.find((a: any) => a.id === agentId);
      if (configAgent) {
        configAgent.model = { primary: agent.model };
        writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      }
    }

    // Restart gateway
    try {
      const { exec } = require("child_process");
      exec("openclaw gateway restart", { timeout: 15000 });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      agent,
      message: `Agent "${agent.name}" updated successfully`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { agentId } = await req.json();

    // Update registry
    const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
    const updated = registry.map((a: any) =>
      a.agent_id === agentId ? { ...a, status: "retired" } : a
    );
    writeFileSync(REGISTRY_PATH, JSON.stringify(updated, null, 2));

    // Remove from openclaw.json
    const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    config.agents.list = config.agents.list.filter((a: any) => a.id !== agentId);
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    // Restart gateway
    try {
      const { exec } = require("child_process");
      exec("openclaw gateway restart", { timeout: 15000 });
    } catch (e) {}

    return NextResponse.json({ success: true, message: `Agent "${agentId}" retired` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
