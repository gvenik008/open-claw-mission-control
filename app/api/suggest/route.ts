import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/suggest — Agent-centric training recommendations
 * 
 * Analyzes each agent's actual work history (tasks, results, patterns)
 * and suggests specific skills/tools they should learn.
 * 
 * Only suggests when there's a real, justified gap.
 * Returns nothing for agents that are already well-equipped.
 * 
 * Query params:
 *   agentId: optional — filter to one agent
 */

interface TrainingSuggestion {
  skill?: string;
  tool?: string;
  why: string;
  evidence: string[];   // specific tasks/results that show the gap
  priority: "high" | "medium";
}

interface AgentTrainingPlan {
  agentId: string;
  agentName: string;
  role: string;
  currentSkillCount: number;
  currentToolCount: number;
  tasksAnalyzed: number;
  suggestions: TrainingSuggestion[];
}

// ── Analysis rules per agent type ──────────────────────────────────────────

interface AnalysisRule {
  // If ANY of these patterns appear in task titles/descriptions/results
  pattern: RegExp;
  // And the agent is MISSING this skill
  requiresSkill?: string;
  requiresTool?: string;
  // Explanation
  why: string;
  priority: "high" | "medium";
}

// Rules that apply to specific agent roles
const QA_FUNCTIONAL_RULES: AnalysisRule[] = [
  {
    pattern: /responsiv|mobile|viewport|breakpoint|tablet|screen size/i,
    requiresSkill: "responsive-testing",
    why: "Agent tested responsive layouts — formalize this as a core skill with viewport-specific methodology",
    priority: "high",
  },
  {
    pattern: /locali[sz]|i18n|l10n|translat|language|locale|rtl/i,
    requiresSkill: "localization-testing",
    why: "Agent encountered localization work — needs structured approach for multi-language validation",
    priority: "high",
  },
  {
    pattern: /dark.?mode|light.?mode|theme|color.?scheme/i,
    requiresSkill: "theme-testing",
    why: "Agent tested themes/modes — should have systematic coverage for dark/light mode validation",
    priority: "medium",
  },
  {
    pattern: /a11y|accessib|wcag|aria|screen.?reader|contrast/i,
    requiresSkill: "accessibility-testing",
    why: "Accessibility patterns found in work — needs dedicated a11y testing methodology",
    priority: "high",
  },
  {
    pattern: /visual|screenshot|pixel|layout.?shift|css.?regression/i,
    requiresSkill: "visual-regression-testing",
    why: "Visual testing came up — add screenshot comparison and visual diff capabilities",
    priority: "medium",
  },
  {
    pattern: /form|input|validation|submit|field/i,
    requiresSkill: "form-validation-testing",
    why: "Lots of form/input testing — formalize edge case and validation testing patterns",
    priority: "medium",
  },
  {
    pattern: /performance|slow|load.?time|lighthouse|speed/i,
    requiresTool: "lighthouse",
    why: "Performance concerns found in testing — Lighthouse would give structured performance metrics",
    priority: "medium",
  },
];

const QA_SECURITY_RULES: AnalysisRule[] = [
  {
    pattern: /api|endpoint|route|request|response/i,
    requiresSkill: "api-security-testing",
    why: "Agent tests API routes — needs structured API security methodology (auth bypass, rate limiting, input validation)",
    priority: "high",
  },
  {
    pattern: /header|cors|csp|content.?security|x-frame/i,
    requiresSkill: "security-headers-audit",
    why: "Security header issues found — add systematic header validation checklist",
    priority: "high",
  },
  {
    pattern: /auth|session|token|jwt|cookie|login/i,
    requiresSkill: "authentication-testing",
    why: "Auth-related testing detected — formalize session management and auth bypass testing",
    priority: "high",
  },
  {
    pattern: /dependency|npm.?audit|outdated|cve|supply.?chain/i,
    requiresTool: "dependency-scanner",
    why: "Dependency risks mentioned — add automated dependency vulnerability scanning",
    priority: "medium",
  },
  {
    pattern: /rate.?limit|brute.?force|dos|throttl/i,
    requiresSkill: "rate-limit-testing",
    why: "Rate limiting issues found — needs methodology for testing abuse prevention",
    priority: "medium",
  },
];

const QA_GENERAL_RULES: AnalysisRule[] = [
  {
    pattern: /api|endpoint|status.?code|json|payload/i,
    requiresSkill: "api-contract-testing",
    why: "API testing is frequent — add contract testing to verify response schemas and edge cases",
    priority: "high",
  },
  {
    pattern: /cross.?page|navigation|sidebar|route|link/i,
    requiresSkill: "navigation-testing",
    why: "Cross-page testing is a pattern — formalize navigation and routing test coverage",
    priority: "medium",
  },
  {
    pattern: /data|database|state|persist|storage/i,
    requiresSkill: "data-integrity-testing",
    why: "Data-related testing detected — add data persistence and state management validation",
    priority: "medium",
  },
  {
    pattern: /performance|slow|load|speed|metric/i,
    requiresTool: "lighthouse",
    why: "Performance came up in general QA — Lighthouse would provide objective metrics",
    priority: "medium",
  },
];

const QA_LEAD_RULES: AnalysisRule[] = [
  {
    pattern: /product|ux|user.?experience|usability|competitor/i,
    requiresSkill: "product-qa-strategy",
    why: "Atlas handles product-level analysis — needs product QA strategy skills to bridge QA and product thinking",
    priority: "medium",
  },
  {
    pattern: /priorit|risk|critical|blocker|severity/i,
    requiresSkill: "risk-based-test-prioritization",
    why: "Test prioritization patterns detected — formalize risk-based testing methodology",
    priority: "medium",
  },
];

const SEO_RULES: AnalysisRule[] = [
  {
    pattern: /core.?web.?vital|cls|lcp|fid|inp|performance/i,
    requiresSkill: "core-web-vitals-optimization",
    why: "CWV analysis is part of audits — add dedicated optimization recommendations skill",
    priority: "high",
  },
  {
    pattern: /local|google.?business|map|location|nap/i,
    requiresSkill: "local-seo",
    why: "Local SEO elements detected — add local search optimization capabilities",
    priority: "medium",
  },
  {
    pattern: /content|blog|copy|article|keyword/i,
    requiresSkill: "content-strategy",
    why: "Content analysis is part of SEO work — formalize content gap and strategy recommendations",
    priority: "medium",
  },
];

const PRODUCT_RULES: AnalysisRule[] = [
  {
    pattern: /onboard|signup|first.?time|activation|funnel/i,
    requiresSkill: "onboarding-optimization",
    why: "Onboarding/activation analysis detected — add dedicated onboarding funnel expertise",
    priority: "high",
  },
  {
    pattern: /monetiz|pricing|revenue|conversion|paid/i,
    requiresSkill: "pricing-strategy",
    why: "Monetization analysis present — strengthen pricing and conversion optimization skills",
    priority: "medium",
  },
  {
    pattern: /a\/b|experiment|test.*variant|hypothesis/i,
    requiresSkill: "experimentation-design",
    why: "A/B testing or experimentation mentioned — add structured experiment design methodology",
    priority: "medium",
  },
];

const FRONTEND_RULES: AnalysisRule[] = [
  {
    pattern: /animation|transition|motion|framer/i,
    requiresSkill: "animation-design",
    why: "UI animations in scope — add motion design and transition best practices",
    priority: "medium",
  },
  {
    pattern: /a11y|accessib|aria|screen.?reader/i,
    requiresSkill: "accessible-frontend",
    why: "Accessibility requirements in UI work — formalize accessible component patterns",
    priority: "high",
  },
  {
    pattern: /test|jest|vitest|playwright|cypress/i,
    requiresSkill: "frontend-testing",
    why: "Frontend code should have tests — add unit/component testing skills",
    priority: "high",
  },
];

const BACKEND_RULES: AnalysisRule[] = [
  {
    pattern: /websocket|real.?time|sse|stream|push/i,
    requiresSkill: "realtime-systems",
    why: "Real-time features in task history — add WebSocket/SSE architecture skills",
    priority: "high",
  },
  {
    pattern: /auth|session|token|jwt|permission/i,
    requiresSkill: "authentication-architecture",
    why: "Auth work detected — formalize authentication and authorization patterns",
    priority: "high",
  },
  {
    pattern: /test|jest|vitest|integration.?test|unit.?test/i,
    requiresSkill: "backend-testing",
    why: "Backend code should have tests — add unit/integration testing methodology",
    priority: "high",
  },
  {
    pattern: /cache|redis|performance|optimi[sz]/i,
    requiresSkill: "caching-strategy",
    why: "Performance optimization detected — add caching and query optimization skills",
    priority: "medium",
  },
];

const AGENT_RULES: Record<string, AnalysisRule[]> = {
  "qa-functional": QA_FUNCTIONAL_RULES,
  "qa-security": QA_SECURITY_RULES,
  "qa-general": QA_GENERAL_RULES,
  "qa-lead": QA_LEAD_RULES,
  "seo-analyst": SEO_RULES,
  "product-manager": PRODUCT_RULES,
  "frontend-dev": FRONTEND_RULES,
  "backend-dev": BACKEND_RULES,
};

function analyzeAgent(agent: any, tasks: any[]): AgentTrainingPlan {
  const skills = new Set<string>(JSON.parse(agent.skills || "[]") as string[]);
  const tools = new Set<string>(JSON.parse(agent.tools || "[]") as string[]);
  const rules = AGENT_RULES[agent.agent_id] || [];

  const agentTasks = tasks.filter(t => t.assignee === agent.agent_id);
  
  // Build text corpus from this agent's actual work
  const corpus = agentTasks.map(t => 
    `${t.title} ${t.description || ""} ${t.result || ""}`
  ).join(" ");

  const suggestions: TrainingSuggestion[] = [];

  for (const rule of rules) {
    // Check if rule pattern matches this agent's work
    const matches = corpus.match(rule.pattern);
    if (!matches) continue;

    // Check if they already have the skill/tool
    if (rule.requiresSkill && skills.has(rule.requiresSkill)) continue;
    if (rule.requiresTool && tools.has(rule.requiresTool)) continue;

    // Find specific tasks that triggered this rule
    const evidence = agentTasks
      .filter(t => rule.pattern.test(`${t.title} ${t.description || ""} ${t.result || ""}`))
      .map(t => t.title)
      .slice(0, 3);

    if (evidence.length === 0) continue;

    // Avoid duplicate suggestions
    const key = rule.requiresSkill || rule.requiresTool;
    if (suggestions.some(s => (s.skill || s.tool) === key)) continue;

    suggestions.push({
      ...(rule.requiresSkill ? { skill: rule.requiresSkill } : {}),
      ...(rule.requiresTool ? { tool: rule.requiresTool } : {}),
      why: rule.why,
      evidence,
      priority: rule.priority,
    });
  }

  // Sort: high priority first, then by evidence count
  suggestions.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "high" ? -1 : 1;
    return b.evidence.length - a.evidence.length;
  });

  return {
    agentId: agent.agent_id,
    agentName: agent.name,
    role: agent.role,
    currentSkillCount: skills.size,
    currentToolCount: tools.size,
    tasksAnalyzed: agentTasks.length,
    suggestions: suggestions.slice(0, 5), // max 5 per agent — quality over quantity
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filterAgent = searchParams.get("agentId");

  try {
    const agents = db.prepare("SELECT * FROM agents WHERE status = 'active'").all() as any[];
    const tasks = db.prepare("SELECT * FROM tasks ORDER BY created_at DESC LIMIT 200").all() as any[];

    const plans: AgentTrainingPlan[] = [];

    for (const agent of agents) {
      // Skip orchestrator and test agents
      if (agent.agent_id === "main" || agent.agent_id === "test-verify") continue;
      if (filterAgent && agent.agent_id !== filterAgent) continue;

      const plan = analyzeAgent(agent, tasks);
      
      // Only include agents that have suggestions
      if (plan.suggestions.length > 0) {
        plans.push(plan);
      }
    }

    // Sort by total high-priority suggestions
    plans.sort((a, b) => {
      const aHigh = a.suggestions.filter(s => s.priority === "high").length;
      const bHigh = b.suggestions.filter(s => s.priority === "high").length;
      return bHigh - aHigh;
    });

    return NextResponse.json({
      agents: plans,
      summary: {
        agentsAnalyzed: agents.length - 2, // minus main + test
        agentsWithSuggestions: plans.length,
        totalSuggestions: plans.reduce((sum, p) => sum + p.suggestions.length, 0),
        tasksAnalyzed: tasks.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/suggest — Accept a training suggestion (add skill/tool to agent)
 * Body: { agentId: string, skill?: string, tool?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { agentId, skill, tool } = await req.json();
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });
    if (!skill && !tool) return NextResponse.json({ error: "skill or tool required" }, { status: 400 });

    const agent = db.prepare("SELECT * FROM agents WHERE agent_id = ?").get(agentId) as any;
    if (!agent) return NextResponse.json({ error: `Agent "${agentId}" not found` }, { status: 404 });

    if (skill) {
      const skills = JSON.parse(agent.skills || "[]");
      if (!skills.includes(skill)) {
        skills.push(skill);
        db.prepare("UPDATE agents SET skills = ?, updated_at = datetime('now') WHERE agent_id = ?")
          .run(JSON.stringify(skills), agentId);
      }
      return NextResponse.json({ success: true, message: `Skill "${skill}" added to ${agent.name}` });
    }

    if (tool) {
      const tools = JSON.parse(agent.tools || "[]");
      if (!tools.includes(tool)) {
        tools.push(tool);
        db.prepare("UPDATE agents SET tools = ?, updated_at = datetime('now') WHERE agent_id = ?")
          .run(JSON.stringify(tools), agentId);
      }
      return NextResponse.json({ success: true, message: `Tool "${tool}" added to ${agent.name}` });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
