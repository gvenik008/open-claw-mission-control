import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";
import { sanitizeText, sanitizeId } from "@/lib/sanitize";

/**
 * Skill Matcher — analyzes a task and finds/creates required skills and tools.
 *
 * POST /api/skill-match
 * Body: { taskDescription: string, agentId?: string }
 *
 * Returns: { neededSkills, neededTools, missingSkills, missingTools, created, agentUpdated }
 */

// ─── Keyword → Skill/Tool mapping ────────────────────────────────────────────

const SKILL_KEYWORDS: Record<string, { skillIds: string[]; toolIds: string[] }> = {
  // Testing
  "test": { skillIds: ["manual-testing", "bug-reporting"], toolIds: ["browser", "file_system"] },
  "qa": { skillIds: ["manual-testing", "test-planning", "bug-reporting"], toolIds: ["browser", "file_system"] },
  "smoke test": { skillIds: ["manual-testing"], toolIds: ["browser"] },
  "regression": { skillIds: ["manual-testing"], toolIds: ["browser", "file_system"] },
  "security": { skillIds: ["security-testing", "vulnerability-assessment"], toolIds: ["browser", "shell", "web_fetch"] },
  "xss": { skillIds: ["security-testing", "code-security-audit"], toolIds: ["browser", "shell"] },
  "penetration": { skillIds: ["security-testing"], toolIds: ["shell", "web_fetch"] },
  "api test": { skillIds: ["api-testing"], toolIds: ["shell", "web_fetch"] },
  "performance": { skillIds: ["performance-testing"], toolIds: ["shell", "web_fetch"] },
  "accessibility": { skillIds: ["accessibility-testing"], toolIds: ["browser"] },
  "mobile": { skillIds: ["mobile-testing"], toolIds: ["browser", "node_camera"] },

  // Development
  "frontend": { skillIds: ["frontend-development"], toolIds: ["shell", "file_system", "browser", "git"] },
  "backend": { skillIds: ["backend-development"], toolIds: ["shell", "file_system", "git", "database"] },
  "react": { skillIds: ["frontend-development"], toolIds: ["shell", "file_system", "browser"] },
  "next.js": { skillIds: ["frontend-development"], toolIds: ["shell", "file_system", "browser"] },
  "nextjs": { skillIds: ["frontend-development"], toolIds: ["shell", "file_system", "browser"] },
  "css": { skillIds: ["frontend-development"], toolIds: ["file_system", "browser"] },
  "database": { skillIds: ["database-design"], toolIds: ["shell", "database", "file_system"] },
  "sql": { skillIds: ["database-design"], toolIds: ["database", "shell"] },
  "api design": { skillIds: ["api-design"], toolIds: ["shell", "file_system", "git"] },
  "refactor": { skillIds: ["refactoring"], toolIds: ["shell", "file_system", "git"] },
  "code review": { skillIds: ["code-review"], toolIds: ["file_system", "git"] },
  "unit test": { skillIds: ["unit-testing"], toolIds: ["shell", "file_system", "git"] },
  "documentation": { skillIds: ["documentation"], toolIds: ["file_system"] },

  // DevOps
  "deploy": { skillIds: ["deployment-automation", "cicd-pipelines"], toolIds: ["shell", "git"] },
  "docker": { skillIds: ["docker"], toolIds: ["shell", "docker"] },
  "kubernetes": { skillIds: ["kubernetes"], toolIds: ["shell"] },
  "ci/cd": { skillIds: ["cicd-pipelines"], toolIds: ["shell", "file_system", "git"] },
  "pipeline": { skillIds: ["cicd-pipelines"], toolIds: ["shell", "git"] },
  "infrastructure": { skillIds: ["cloud-infrastructure", "iac"], toolIds: ["shell", "file_system"] },
  "monitoring": { skillIds: ["monitoring"], toolIds: ["shell", "web_fetch"] },
  "log": { skillIds: ["log-analysis"], toolIds: ["shell", "file_system"] },

  // Research
  "research": { skillIds: ["market-research", "tech-evaluation"], toolIds: ["web_search", "web_fetch", "file_system"] },
  "competitor": { skillIds: ["competitor-analysis"], toolIds: ["web_search", "web_fetch", "browser"] },
  "seo": { skillIds: ["seo-research"], toolIds: ["web_search", "web_fetch"] },
  "scrape": { skillIds: ["data-scraping"], toolIds: ["browser", "web_fetch", "shell"] },
  "trend": { skillIds: ["trend-monitoring"], toolIds: ["web_search", "web_fetch", "cron"] },
  "analyze": { skillIds: ["data-analysis"], toolIds: ["shell", "file_system"] },
  "report": { skillIds: ["report-generation", "status-reporting"], toolIds: ["file_system"] },

  // Design & Product
  "ux": { skillIds: ["user-experience-analysis", "user-journey-mapping", "usability-heuristics"], toolIds: ["browser", "file_system"] },
  "design": { skillIds: ["design-system-analysis", "user-experience-analysis"], toolIds: ["browser", "file_system"] },
  "user flow": { skillIds: ["user-journey-mapping"], toolIds: ["browser"] },
  "product": { skillIds: ["product-strategy", "user-experience-analysis", "feature-prioritization"], toolIds: ["browser", "web_fetch", "file_system"] },
  "feature": { skillIds: ["feature-prioritization", "product-strategy"], toolIds: ["browser", "file_system"] },
  "conversion": { skillIds: ["conversion-optimization", "user-journey-mapping"], toolIds: ["browser", "web_fetch"] },
  "monetization": { skillIds: ["monetization-strategy"], toolIds: ["browser", "web_fetch"] },
  "competitive": { skillIds: ["competitive-analysis", "market-research"], toolIds: ["web_search", "web_fetch", "browser"] },
  "improvement": { skillIds: ["product-strategy", "feature-prioritization"], toolIds: ["browser", "file_system"] },

  // Project Management
  "sprint": { skillIds: ["sprint-planning"], toolIds: ["file_system"] },
  "plan": { skillIds: ["task-breakdown", "sprint-planning"], toolIds: ["file_system"] },
  "risk": { skillIds: ["risk-assessment"], toolIds: ["file_system"] },

  // Security specific
  "vulnerability": { skillIds: ["vulnerability-assessment"], toolIds: ["shell", "web_search"] },
  "audit": { skillIds: ["code-security-audit", "compliance-checking"], toolIds: ["file_system", "git"] },
  "secret": { skillIds: ["secret-detection"], toolIds: ["shell", "file_system", "git"] },
  "compliance": { skillIds: ["compliance-checking"], toolIds: ["file_system", "web_search"] },
  "owasp": { skillIds: ["security-testing", "vulnerability-assessment", "threat-modeling"], toolIds: ["browser", "shell", "web_fetch"] },
  "injection": { skillIds: ["security-testing", "input-fuzzing"], toolIds: ["browser", "shell"] },
  "auth": { skillIds: ["auth-bypass-testing", "session-management-testing"], toolIds: ["browser", "shell"] },
  "cors": { skillIds: ["header-security-audit", "api-security-testing"], toolIds: ["shell", "web_fetch"] },
  "header": { skillIds: ["header-security-audit"], toolIds: ["shell", "web_fetch"] },
  "privacy": { skillIds: ["data-exposure-detection"], toolIds: ["browser", "shell"] },

  // Web
  "browse": { skillIds: [], toolIds: ["browser"] },
  "search": { skillIds: [], toolIds: ["web_search", "web_fetch"] },
  "crawl": { skillIds: ["data-scraping"], toolIds: ["browser", "web_fetch"] },
  "fetch": { skillIds: [], toolIds: ["web_fetch"] },
};

// ─── Auto-generate skill if it doesn't exist in DB ──────────────────────────

function ensureSkillExists(skillId: string): boolean {
  const existing = db.prepare("SELECT id FROM skills WHERE id = ?").get(skillId);
  if (existing) return false;

  // Generate a reasonable skill entry from the ID
  const name = skillId.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  const category = guessCategory(skillId);

  db.prepare(`
    INSERT INTO skills (id, name, category, description, required_tools, prompt_additions)
    VALUES (?, ?, ?, ?, '[]', ?)
  `).run(skillId, name, category, `Auto-discovered skill: ${name}`, `You are skilled in ${name.toLowerCase()}.`);

  return true; // was created
}

function ensureToolExists(toolId: string): boolean {
  const existing = db.prepare("SELECT id FROM tools WHERE id = ?").get(toolId);
  if (existing) return false;

  const name = toolId.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  const category = toolId.includes("web") ? "Web" : toolId.includes("shell") || toolId.includes("file") ? "System" : "Custom";

  db.prepare(`INSERT INTO tools (id, name, category, description) VALUES (?, ?, ?, ?)`).run(
    toolId, name, category, `Auto-discovered tool: ${name}`
  );

  return true;
}

function guessCategory(skillId: string): string {
  if (skillId.includes("test") || skillId.includes("bug") || skillId.includes("qa")) return "QA & Testing";
  if (skillId.includes("security") || skillId.includes("vulnerability") || skillId.includes("audit")) return "Security";
  if (skillId.includes("deploy") || skillId.includes("docker") || skillId.includes("ci")) return "DevOps & Infrastructure";
  if (skillId.includes("frontend") || skillId.includes("backend") || skillId.includes("code") || skillId.includes("api")) return "Development";
  if (skillId.includes("research") || skillId.includes("analysis") || skillId.includes("seo")) return "Research & Analysis";
  if (skillId.includes("design") || skillId.includes("ux")) return "Design & UX";
  if (skillId.includes("sprint") || skillId.includes("plan") || skillId.includes("risk") || skillId.includes("report")) return "Project Management";
  if (skillId.includes("data")) return "Data";
  return "Custom";
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { taskDescription, agentId } = await req.json();
    if (!taskDescription) {
      return NextResponse.json({ error: "taskDescription required" }, { status: 400 });
    }

    const desc = taskDescription.toLowerCase();

    // Find matching skills and tools from keywords
    const neededSkillIds = new Set<string>();
    const neededToolIds = new Set<string>();

    for (const [keyword, mapping] of Object.entries(SKILL_KEYWORDS)) {
      if (desc.includes(keyword)) {
        mapping.skillIds.forEach((s) => neededSkillIds.add(s));
        mapping.toolIds.forEach((t) => neededToolIds.add(t));
      }
    }

    // If nothing matched, suggest general skills
    if (neededSkillIds.size === 0) {
      neededSkillIds.add("task-breakdown");
      neededToolIds.add("file_system");
    }

    // Ensure all needed skills/tools exist in DB
    const createdSkills: string[] = [];
    const createdTools: string[] = [];

    for (const skillId of neededSkillIds) {
      if (ensureSkillExists(skillId)) createdSkills.push(skillId);
    }
    for (const toolId of neededToolIds) {
      if (ensureToolExists(toolId)) createdTools.push(toolId);
    }

    // Check agent's current skills/tools
    let missingSkills: string[] = [];
    let missingTools: string[] = [];
    let agentUpdated = false;

    if (agentId) {
      const agent = db.prepare("SELECT * FROM agents WHERE agent_id = ?").get(agentId) as any;
      if (agent) {
        const currentSkills = new Set(JSON.parse(agent.skills || "[]"));
        const currentTools = new Set(JSON.parse(agent.tools || "[]"));

        missingSkills = [...neededSkillIds].filter((s) => !currentSkills.has(s));
        missingTools = [...neededToolIds].filter((t) => !currentTools.has(t));

        // Auto-assign missing skills/tools to the agent
        if (missingSkills.length > 0 || missingTools.length > 0) {
          const updatedSkills = [...new Set([...currentSkills, ...neededSkillIds])];
          const updatedTools = [...new Set([...currentTools, ...neededToolIds])];

          db.prepare("UPDATE agents SET skills = ?, tools = ?, updated_at = datetime('now') WHERE agent_id = ?").run(
            JSON.stringify(updatedSkills), JSON.stringify(updatedTools), agentId
          );

          // Log activity
          db.prepare("INSERT INTO activities (id, agent_id, action, detail) VALUES (?, ?, 'skills_auto_assigned', ?)").run(
            genId(), agentId,
            `Auto-assigned ${missingSkills.length} skills + ${missingTools.length} tools for task`
          );

          agentUpdated = true;
        }
      }
    }

    // ─── Find best matching agent ──────────────────────────────────────────
    let recommendedAgent: { agent_id: string; name: string; score: number; matchedSkills: string[] } | null = null;

    if (!agentId) {
      const allAgents = db.prepare("SELECT * FROM agents WHERE status = 'active' AND agent_id != 'main'").all() as any[];
      let bestScore = 0;

      for (const agent of allAgents) {
        const agentSkills = new Set<string>(JSON.parse(agent.skills || "[]").filter(Boolean));
        const agentTools = new Set<string>(JSON.parse(agent.tools || "[]").filter(Boolean));

        // Score = matched skills × 2 + matched tools × 1
        const matchedSkills = [...neededSkillIds].filter((s) => agentSkills.has(s));
        const matchedTools = [...neededToolIds].filter((t) => agentTools.has(t));
        const score = matchedSkills.length * 2 + matchedTools.length;

        if (score > bestScore) {
          bestScore = score;
          recommendedAgent = {
            agent_id: agent.agent_id,
            name: agent.name,
            score,
            matchedSkills,
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      neededSkills: [...neededSkillIds],
      neededTools: [...neededToolIds],
      missingSkills,
      missingTools,
      created: { skills: createdSkills, tools: createdTools },
      agentUpdated,
      recommendedAgent,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
