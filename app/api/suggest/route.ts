import { NextRequest, NextResponse } from "next/server";
import { db, genId } from "@/lib/db";
import { masterDb } from "@/lib/master-db";

export const dynamic = "force-dynamic";

/**
 * GET /api/suggest — Analyze user activity and recommend skills & tools
 * 
 * Query params:
 *   type: "skills" | "tools" | "all" (default: "all")
 *   limit: max recommendations (default: 10)
 * 
 * Returns personalized suggestions based on:
 *   - Task history (what they've been doing)
 *   - Current agent capabilities (what they already have)
 *   - Shared catalog (what's available to add)
 *   - Activity patterns (frequency/type of work)
 */

interface Suggestion {
  id: string;
  name: string;
  category: string;
  description: string;
  type: "skill" | "tool";
  reason: string;
  confidence: "high" | "medium" | "low";
  basedOn: string[];
}

// ── Keywords → skills/tools mapping ─────────────────────────────────────────

const SKILL_SIGNALS: Record<string, { keywords: string[]; weight: number }> = {
  // Security
  "penetration-testing": { keywords: ["xss", "injection", "csrf", "vulnerability", "exploit", "owasp", "pentest", "security audit"], weight: 3 },
  "api-security": { keywords: ["api security", "auth", "token", "jwt", "oauth", "cors", "rate limit"], weight: 2 },
  "input-fuzzing": { keywords: ["fuzz", "input validation", "boundary", "edge case", "malformed"], weight: 2 },
  // QA
  "responsive-testing": { keywords: ["responsive", "mobile", "tablet", "viewport", "breakpoint", "media query"], weight: 3 },
  "accessibility-testing": { keywords: ["a11y", "accessibility", "wcag", "aria", "screen reader", "contrast"], weight: 3 },
  "performance-testing": { keywords: ["performance", "load test", "latency", "speed", "lighthouse", "core web vitals", "pagespeed"], weight: 3 },
  "cross-browser-testing": { keywords: ["cross-browser", "safari", "firefox", "chrome", "browser compat"], weight: 2 },
  "visual-regression": { keywords: ["visual regression", "screenshot", "pixel diff", "layout shift"], weight: 2 },
  "e2e-testing": { keywords: ["e2e", "end to end", "playwright", "cypress", "selenium", "user flow"], weight: 2 },
  "api-testing": { keywords: ["api test", "postman", "endpoint", "rest", "graphql", "status code"], weight: 2 },
  "localization-testing": { keywords: ["localization", "i18n", "l10n", "translation", "language", "locale", "rtl"], weight: 3 },
  // Product
  "competitive-analysis": { keywords: ["competitor", "competitive", "benchmark", "market", "compare"], weight: 2 },
  "user-journey-mapping": { keywords: ["user journey", "user flow", "funnel", "conversion", "onboarding"], weight: 2 },
  "feature-prioritization": { keywords: ["prioritize", "roadmap", "backlog", "feature request", "mvp"], weight: 2 },
  "ux-audit": { keywords: ["ux", "usability", "user experience", "heuristic", "ui review"], weight: 3 },
  // SEO
  "technical-seo": { keywords: ["seo", "meta tag", "sitemap", "robots", "structured data", "schema markup"], weight: 3 },
  "keyword-research": { keywords: ["keyword", "search volume", "ranking", "serp"], weight: 2 },
  "content-strategy": { keywords: ["content strategy", "blog", "copy", "content gap"], weight: 2 },
  // Dev
  "ci-cd": { keywords: ["ci/cd", "pipeline", "deploy", "github actions", "docker", "build"], weight: 2 },
  "database-optimization": { keywords: ["database", "query optimization", "index", "slow query", "migration"], weight: 2 },
  "error-monitoring": { keywords: ["error tracking", "sentry", "monitoring", "alerting", "logging", "crash"], weight: 2 },
};

const TOOL_SIGNALS: Record<string, { keywords: string[]; weight: number }> = {
  "lighthouse": { keywords: ["performance", "lighthouse", "pagespeed", "core web vitals", "speed"], weight: 3 },
  "axe-accessibility": { keywords: ["accessibility", "a11y", "wcag", "aria", "screen reader"], weight: 3 },
  "browser-devtools": { keywords: ["devtools", "network tab", "console", "inspector", "debug"], weight: 2 },
  "api-client": { keywords: ["api test", "postman", "curl", "endpoint", "rest client"], weight: 2 },
  "screenshot-diff": { keywords: ["visual regression", "screenshot", "pixel", "diff"], weight: 2 },
  "network-monitor": { keywords: ["network", "request", "response", "waterfall", "latency"], weight: 2 },
  "seo-crawler": { keywords: ["seo", "crawl", "sitemap", "broken link", "meta tag"], weight: 2 },
  "load-tester": { keywords: ["load test", "stress test", "concurrent", "throughput", "k6", "artillery"], weight: 2 },
  "code-scanner": { keywords: ["code scan", "static analysis", "lint", "sonar", "code quality"], weight: 2 },
  "dependency-checker": { keywords: ["dependency", "outdated", "vulnerability", "npm audit", "snyk"], weight: 2 },
};

function analyzeText(texts: string[]): Map<string, { score: number; matches: string[] }> {
  const combined = texts.join(" ").toLowerCase();
  const results = new Map<string, { score: number; matches: string[] }>();

  // Analyze skill signals
  for (const [skillId, signal] of Object.entries(SKILL_SIGNALS)) {
    let score = 0;
    const matches: string[] = [];
    for (const kw of signal.keywords) {
      const regex = new RegExp(kw, "gi");
      const count = (combined.match(regex) || []).length;
      if (count > 0) {
        score += count * signal.weight;
        matches.push(kw);
      }
    }
    if (score > 0) {
      results.set(`skill:${skillId}`, { score, matches });
    }
  }

  // Analyze tool signals
  for (const [toolId, signal] of Object.entries(TOOL_SIGNALS)) {
    let score = 0;
    const matches: string[] = [];
    for (const kw of signal.keywords) {
      const regex = new RegExp(kw, "gi");
      const count = (combined.match(regex) || []).length;
      if (count > 0) {
        score += count * signal.weight;
        matches.push(kw);
      }
    }
    if (score > 0) {
      results.set(`tool:${toolId}`, { score, matches });
    }
  }

  return results;
}

function getConfidence(score: number): "high" | "medium" | "low" {
  if (score >= 10) return "high";
  if (score >= 4) return "medium";
  return "low";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "all";
  const limit = parseInt(searchParams.get("limit") || "10");

  try {
    // 1. Gather user activity data
    const tasks = db.prepare("SELECT title, description, status, assignee FROM tasks ORDER BY created_at DESC LIMIT 100").all() as any[];
    const activities = db.prepare("SELECT action, detail FROM activities ORDER BY created_at DESC LIMIT 200").all() as any[];
    const agents = db.prepare("SELECT agent_id, name, role, skills, tools FROM agents").all() as any[];

    // Build text corpus from user activity
    const activityTexts: string[] = [];
    for (const t of tasks) {
      activityTexts.push(`${t.title} ${t.description}`);
    }
    for (const a of activities) {
      activityTexts.push(`${a.action} ${a.detail}`);
    }

    // 2. Get what user already has
    const existingSkills = new Set<string>();
    const existingTools = new Set<string>();

    const userSkills = db.prepare("SELECT id FROM skills").all() as any[];
    const userTools = db.prepare("SELECT id FROM tools").all() as any[];
    userSkills.forEach((s: any) => existingSkills.add(s.id));
    userTools.forEach((t: any) => existingTools.add(t.id));

    // Also count agent skills/tools
    for (const agent of agents) {
      try {
        const sk = JSON.parse(agent.skills || "[]");
        const tl = JSON.parse(agent.tools || "[]");
        sk.forEach((s: string) => existingSkills.add(s));
        tl.forEach((t: string) => existingTools.add(t));
      } catch { /* skip */ }
    }

    // 3. Get shared catalog (available to suggest)
    const sharedSkills = masterDb.prepare("SELECT * FROM shared_skills").all() as any[];
    const sharedTools = masterDb.prepare("SELECT * FROM shared_tools").all() as any[];

    // 4. Analyze activity for signals
    const signals = analyzeText(activityTexts);

    // 5. Build suggestions
    const suggestions: Suggestion[] = [];

    // Skill suggestions
    if (type === "all" || type === "skills") {
      for (const [key, { score, matches }] of signals) {
        if (!key.startsWith("skill:")) continue;
        const skillId = key.replace("skill:", "");

        // Check if already in shared catalog for richer info
        const shared = sharedSkills.find((s: any) => s.id === skillId);
        const alreadyHas = existingSkills.has(skillId);

        suggestions.push({
          id: skillId,
          name: shared?.name || skillId.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          category: shared?.category || "Suggested",
          description: shared?.description || `Recommended based on your activity patterns`,
          type: "skill",
          reason: alreadyHas
            ? `You already have this — your activity confirms it's relevant (matched: ${matches.join(", ")})`
            : `Your tasks frequently involve ${matches.join(", ")} — this skill would strengthen your team`,
          confidence: getConfidence(score),
          basedOn: matches,
        });
      }

      // Also suggest from shared catalog based on category gaps
      const userCategories = new Set(userSkills.map((s: any) => {
        const full = db.prepare("SELECT category FROM skills WHERE id = ?").get(s.id) as any;
        return full?.category;
      }).filter(Boolean));

      for (const shared of sharedSkills) {
        const skillId = (shared as any).id;
        if (existingSkills.has(skillId)) continue;
        if (signals.has(`skill:${skillId}`)) continue; // already suggested

        // If we don't have any skills in this category, suggest top ones
        if (!userCategories.has((shared as any).category)) {
          suggestions.push({
            id: skillId,
            name: (shared as any).name,
            category: (shared as any).category,
            description: (shared as any).description,
            type: "skill",
            reason: `Expand your capabilities — you don't have any ${(shared as any).category} skills yet`,
            confidence: "low",
            basedOn: ["category gap"],
          });
        }
      }
    }

    // Tool suggestions
    if (type === "all" || type === "tools") {
      for (const [key, { score, matches }] of signals) {
        if (!key.startsWith("tool:")) continue;
        const toolId = key.replace("tool:", "");
        const shared = sharedTools.find((t: any) => t.id === toolId);
        const alreadyHas = existingTools.has(toolId);

        suggestions.push({
          id: toolId,
          name: shared?.name || toolId.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          category: shared?.category || "Suggested",
          description: shared?.description || `Recommended based on your activity patterns`,
          type: "tool",
          reason: alreadyHas
            ? `Already in your toolkit — confirmed relevant (matched: ${matches.join(", ")})`
            : `Your work involves ${matches.join(", ")} — this tool would help`,
          confidence: getConfidence(score),
          basedOn: matches,
        });
      }
    }

    // 6. Sort by confidence + score, deduplicate, limit
    const order = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => {
      const diff = order[a.confidence] - order[b.confidence];
      if (diff !== 0) return diff;
      // Within same confidence, prefer items they DON'T have yet
      const aHas = (a.type === "skill" ? existingSkills : existingTools).has(a.id);
      const bHas = (b.type === "skill" ? existingSkills : existingTools).has(b.id);
      if (aHas !== bHas) return aHas ? 1 : -1;
      return 0;
    });

    // Separate into new suggestions vs confirmations
    const newSuggestions = suggestions.filter(s => {
      const set = s.type === "skill" ? existingSkills : existingTools;
      return !set.has(s.id);
    });
    const confirmations = suggestions.filter(s => {
      const set = s.type === "skill" ? existingSkills : existingTools;
      return set.has(s.id);
    });

    return NextResponse.json({
      suggestions: newSuggestions.slice(0, limit),
      alreadyRelevant: confirmations.slice(0, 5),
      analysis: {
        totalTasks: tasks.length,
        totalActivities: activities.length,
        existingSkillCount: existingSkills.size,
        existingToolCount: existingTools.size,
        sharedCatalogSkills: sharedSkills.length,
        sharedCatalogTools: sharedTools.length,
        topSignals: [...signals.entries()]
          .sort((a, b) => b[1].score - a[1].score)
          .slice(0, 10)
          .map(([key, val]) => ({ id: key, score: val.score, keywords: val.matches })),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/suggest — Accept a suggestion (add skill or tool to user's instance)
 * 
 * Body: { id: string, type: "skill" | "tool" }
 */
export async function POST(req: NextRequest) {
  try {
    const { id, type } = await req.json();
    if (!id || !type) {
      return NextResponse.json({ error: "id and type required" }, { status: 400 });
    }

    if (type === "skill") {
      // Copy from shared catalog or create placeholder
      const shared = masterDb.prepare("SELECT * FROM shared_skills WHERE id = ?").get(id) as any;
      if (shared) {
        db.prepare(`
          INSERT INTO skills (id, name, category, description, required_tools, prompt_additions)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET updated_at=datetime('now')
        `).run(shared.id, shared.name, shared.category, shared.description, shared.required_tools, shared.prompt_additions);
      } else {
        db.prepare(`
          INSERT INTO skills (id, name, category, description)
          VALUES (?, ?, 'Custom', 'User-accepted suggestion')
          ON CONFLICT(id) DO UPDATE SET updated_at=datetime('now')
        `).run(id, id.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()));
      }
      return NextResponse.json({ success: true, message: `Skill "${id}" added` });
    }

    if (type === "tool") {
      const shared = masterDb.prepare("SELECT * FROM shared_tools WHERE id = ?").get(id) as any;
      if (shared) {
        db.prepare(`
          INSERT INTO tools (id, name, category, description)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET updated_at=datetime('now')
        `).run(shared.id, shared.name, shared.category, shared.description);
      } else {
        db.prepare(`
          INSERT INTO tools (id, name, category, description)
          VALUES (?, ?, 'Custom', 'User-accepted suggestion')
          ON CONFLICT(id) DO UPDATE SET updated_at=datetime('now')
        `).run(id, id.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()));
      }
      return NextResponse.json({ success: true, message: `Tool "${id}" added` });
    }

    return NextResponse.json({ error: "type must be 'skill' or 'tool'" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
