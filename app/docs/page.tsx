"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, BookOpen, Code, Map, ChevronDown, ChevronRight, Search, ExternalLink, Users, Zap, GitBranch, ChevronUp } from "lucide-react";

interface AgentDoc {
  agent_id: string;
  name: string;
  role: string;
  division: string;
  soulPath: string | null;
  soulContent?: string;
  expanded: boolean;
}

// API Reference data
const API_ENDPOINTS = [
  {
    method: "GET",
    path: "/api/deploy-agent",
    description: "List all deployed agents",
    params: [],
    response: '{ "agents": [...] }',
  },
  {
    method: "POST",
    path: "/api/deploy-agent",
    description: "Deploy a new agent",
    params: [
      { name: "name", type: "string", desc: "Agent ID / name" },
      { name: "role", type: "string", desc: "Agent role description" },
      { name: "division", type: "string", desc: "qa | engineering | product | research" },
      { name: "model", type: "string", desc: "LLM model identifier" },
      { name: "skills", type: "string[]", desc: "Array of skill IDs" },
      { name: "tools", type: "string[]", desc: "Array of tool names" },
    ],
    response: '{ "agent": { "agent_id": "...", "name": "..." } }',
  },
  {
    method: "GET",
    path: "/api/tasks",
    description: "List all tasks with agent info",
    params: [],
    response: '{ "tasks": [...], "agents": [...] }',
  },
  {
    method: "POST",
    path: "/api/tasks",
    description: "Create a new task",
    params: [
      { name: "title", type: "string", desc: "Task title" },
      { name: "description", type: "string", desc: "Task description" },
      { name: "assignee", type: "string", desc: "Agent ID to assign to" },
      { name: "priority", type: "string", desc: "urgent | high | medium | low" },
      { name: "due_date", type: "string?", desc: "ISO date string (optional)" },
    ],
    response: '{ "task": { "id": "...", "title": "..." } }',
  },
  {
    method: "PATCH",
    path: "/api/tasks",
    description: "Update task status or result",
    params: [
      { name: "id", type: "string", desc: "Task ID" },
      { name: "status", type: "string?", desc: "pending | in_progress | review | done | cancelled" },
      { name: "result", type: "string?", desc: "Task result or output" },
    ],
    response: '{ "task": { "id": "...", "status": "done" } }',
  },
  {
    method: "DELETE",
    path: "/api/tasks",
    description: "Delete a task",
    params: [{ name: "id", type: "string", desc: "Task ID to delete" }],
    response: '{ "ok": true }',
  },
  {
    method: "POST",
    path: "/api/train",
    description: "Train an agent with a lesson",
    params: [
      { name: "agent_id", type: "string", desc: "Agent to train" },
      { name: "lesson", type: "string", desc: "Lesson content (markdown)" },
      { name: "tags", type: "string[]?", desc: "Optional tags for the lesson" },
    ],
    response: '{ "ok": true, "memory_id": "..." }',
  },
  {
    method: "POST",
    path: "/api/skill-match",
    description: "Find the best agent for a task",
    params: [{ name: "taskDescription", type: "string", desc: "Description of the task to match" }],
    response: '{ "recommendedAgent": {...}, "neededSkills": [...], "score": 20 }',
  },
  {
    method: "GET",
    path: "/api/reports",
    description: "List all saved reports",
    params: [],
    response: '{ "reports": [{ "filename": "...", "title": "...", "date": "..." }] }',
  },
  {
    method: "POST",
    path: "/api/reports",
    description: "Save a new report",
    params: [
      { name: "filename", type: "string", desc: "e.g. 2026-03-23-report-name.md" },
      { name: "content", type: "string", desc: "Markdown content" },
    ],
    response: '{ "ok": true }',
  },
  {
    method: "GET",
    path: "/api/activities",
    description: "List agent activities",
    params: [{ name: "limit", type: "number?", desc: "Max activities to return (default 100)" }],
    response: '{ "activities": [...] }',
  },
  {
    method: "POST",
    path: "/api/activities",
    description: "Log an agent activity",
    params: [
      { name: "agent_id", type: "string", desc: "Agent ID" },
      { name: "action", type: "string", desc: "Action type" },
      { name: "detail", type: "string?", desc: "Action detail" },
    ],
    response: '{ "ok": true }',
  },
  {
    method: "GET",
    path: "/api/skills",
    description: "List all available skills",
    params: [],
    response: '{ "skills": [{ "id": "...", "name": "...", "category": "..." }] }',
  },
  {
    method: "GET",
    path: "/api/tools",
    description: "List all available tools",
    params: [],
    response: '{ "tools": [{ "id": "...", "name": "...", "category": "..." }] }',
  },
];

// Guides content
const GUIDES = [
  {
    title: "Agent Hierarchy",
    icon: Users,
    content: `Mission Control uses a hierarchical multi-agent system:

**Main Agent (Gvenik)** — The central orchestrator. Handles all user interactions, routes requests, spawns sub-agents, and coordinates work across the team.

**Division Leads** — Senior agents that manage specialized teams:
- Atlas — QA Lead, coordinates testing
- Scout — Research & intelligence
- Sentinel — Security specialist
- Rover — DevOps & infrastructure
- Prism — Product strategy

**Worker Agents** — Specialized agents deployed for specific tasks:
- Functional QA testers
- Backend/Frontend developers
- Data analysts
- etc.

Each agent has its own workspace at \`~/.openclaw/workspace-{agent_id}/\` with a SOUL.md defining its identity and memory files for continuity.`,
  },
  {
    title: "Task Flow",
    icon: GitBranch,
    content: `How tasks move through the system:

**1. Task Creation**
Tasks are created via:
- Telegram: \`/task <description>\`
- Mission Control UI: Tasks page
- API: \`POST /api/tasks\`

**2. Skill Matching**
\`POST /api/skill-match\` analyzes the task description and finds the best-suited agent based on:
- Agent skills and their match score
- Agent current workload
- Task type and requirements

**3. Execution**
The main agent spawns the assigned agent as a sub-agent with:
- Task description in the prompt
- Appropriate timeout (10-20 minutes)
- Instructions to write findings early

**4. Completion**
When done, the agent:
- Returns results to the main agent
- Task is PATCH'd to \`done\` with the result
- Reports are saved via \`POST /api/reports\`
- Activities are logged for monitoring`,
  },
  {
    title: "Training System",
    icon: Zap,
    content: `Agents learn and improve over time:

**Lesson Storage**
Lessons are stored in the \`memories\` table via \`POST /api/train\`:
\`\`\`json
{
  "agent_id": "sentinel",
  "lesson": "When testing XSS, always check...",
  "tags": ["security", "xss"]
}
\`\`\`

**Auto-training**
After significant tasks, the main agent can automatically extract lessons and train the relevant agent. This is triggered by:
- Task completion events
- Explicit training requests
- Heartbeat memory reviews

**Memory Files**
Each agent maintains:
- \`SOUL.md\` — Core identity and principles
- \`memory/YYYY-MM-DD.md\` — Daily activity logs
- DB memories via \`/api/train\` — Structured lessons

**Skill Assignment**
\`POST /api/skill-match\` with \`autoAssign: true\` will automatically assign matched skills to an agent for future improvements.`,
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  PATCH: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  DELETE: "bg-red-500/10 text-red-400 border border-red-500/20",
};

export default function DocsPage() {
  const [tab, setTab] = useState<"agents" | "api" | "guides">("agents");
  const [agents, setAgents] = useState<AgentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedEndpoint, setExpandedEndpoint] = useState<number | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deploy-agent");
      const data = await res.json();
      const agentList: AgentDoc[] = (Array.isArray(data) ? data : data.agents || []).map((a: any) => ({
        agent_id: a.agent_id,
        name: a.name,
        role: a.role,
        division: a.division,
        soulPath: `../workspace-${a.agent_id}/SOUL.md`,
        expanded: false,
      }));
      setAgents(agentList);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadSoul = async (agentId: string) => {
    const agent = agents.find((a) => a.agent_id === agentId);
    if (!agent || agent.soulContent !== undefined) {
      setAgents((prev) =>
        prev.map((a) => (a.agent_id === agentId ? { ...a, expanded: !a.expanded } : a))
      );
      return;
    }
    try {
      const res = await fetch(`/api/memory?path=${encodeURIComponent(`../workspace-${agentId}/SOUL.md`)}`);
      if (res.ok) {
        const data = await res.json();
        setAgents((prev) =>
          prev.map((a) =>
            a.agent_id === agentId ? { ...a, soulContent: data.content || "No content found.", expanded: true } : a
          )
        );
        return;
      }
    } catch {}
    setAgents((prev) =>
      prev.map((a) =>
        a.agent_id === agentId ? { ...a, soulContent: "Could not load SOUL.md for this agent.", expanded: true } : a
      )
    );
  };

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase()) ||
      a.division.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEndpoints = API_ENDPOINTS.filter(
    (e) =>
      e.path.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.method.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Docs</h1>
          <p className="text-sm text-[#555555] mt-0.5">Agent documentation, API reference, and guides</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-md text-[13px] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555]" />
        <input
          type="text"
          placeholder="Search documentation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#111111] border border-[#222222] rounded-md pl-10 pr-4 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] outline-none focus:border-[#333333]"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#111111] border border-[#222222] rounded-md p-1 w-fit">
        {([
          { key: "agents", label: "Agent Docs", icon: Users },
          { key: "api", label: "API Reference", icon: Code },
          { key: "guides", label: "Guides", icon: Map },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-[13px] transition-colors ${
              tab === t.key ? "bg-[#5e6ad2] text-white" : "text-[#888888] hover:text-[#f5f5f5]"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Agent Docs */}
      {tab === "agents" && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-[#555555] p-4">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-[13px]">Loading agents...</span>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="bg-[#111111] border border-[#222222] rounded-md p-8 text-center">
              <Users className="w-8 h-8 text-[#444444] mx-auto mb-3" />
              <p className="text-[13px] text-[#555555]">No agents found</p>
            </div>
          ) : (
            filteredAgents.map((agent) => (
              <div key={agent.agent_id} className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
                <button
                  onClick={() => loadSoul(agent.agent_id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-md bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-[#5e6ad2]">
                        {agent.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-[#f5f5f5]">{agent.name}</span>
                        <span className="text-[10px] text-[#444444] bg-[#1a1a1a] px-1.5 py-0.5 rounded capitalize">
                          {agent.division}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#555555] mt-0.5 line-clamp-1 max-w-lg">{agent.role}</p>
                    </div>
                  </div>
                  {agent.expanded ? (
                    <ChevronUp className="w-4 h-4 text-[#555555] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#555555] shrink-0" />
                  )}
                </button>
                {agent.expanded && (
                  <div className="border-t border-[#222222] px-5 py-4 bg-[#0d0d0d]">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-3.5 h-3.5 text-[#5e6ad2]" />
                      <span className="text-[11px] text-[#5e6ad2] uppercase tracking-wider">SOUL.md</span>
                    </div>
                    <pre className="text-[12px] text-[#888888] whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                      {agent.soulContent || "Loading..."}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* API Reference */}
      {tab === "api" && (
        <div className="space-y-2">
          {filteredEndpoints.map((endpoint, i) => (
            <div key={i} className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
              <button
                onClick={() => setExpandedEndpoint(expandedEndpoint === i ? null : i)}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#1a1a1a] transition-colors text-left"
              >
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${METHOD_COLORS[endpoint.method]}`}>
                  {endpoint.method}
                </span>
                <code className="text-[13px] text-[#5e6ad2] font-mono flex-1">{endpoint.path}</code>
                <span className="text-[12px] text-[#555555] flex-1">{endpoint.description}</span>
                {expandedEndpoint === i ? (
                  <ChevronUp className="w-4 h-4 text-[#555555] shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#555555] shrink-0" />
                )}
              </button>
              {expandedEndpoint === i && (
                <div className="border-t border-[#222222] px-5 py-4 space-y-4">
                  {endpoint.params.length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-[#555555] mb-2">Parameters</h4>
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="border-b border-[#1a1a1a]">
                            <th className="text-left py-1.5 text-[#555555] font-normal">Name</th>
                            <th className="text-left py-1.5 text-[#555555] font-normal">Type</th>
                            <th className="text-left py-1.5 text-[#555555] font-normal">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#111111]">
                          {endpoint.params.map((param) => (
                            <tr key={param.name}>
                              <td className="py-1.5 pr-4 font-mono text-[#5e6ad2]">{param.name}</td>
                              <td className="py-1.5 pr-4 text-[#888888]">{param.type}</td>
                              <td className="py-1.5 text-[#555555]">{param.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider text-[#555555] mb-2">Response</h4>
                    <pre className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md px-4 py-3 text-[12px] text-[#aaa] font-mono overflow-x-auto">
                      {endpoint.response}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Guides */}
      {tab === "guides" && (
        <div className="space-y-2">
          {GUIDES.filter(
            (g) =>
              g.title.toLowerCase().includes(search.toLowerCase()) ||
              g.content.toLowerCase().includes(search.toLowerCase())
          ).map((guide, i) => (
            <div key={i} className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
              <button
                onClick={() => setExpandedGuide(expandedGuide === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <guide.icon className="w-4 h-4 text-[#5e6ad2]" />
                  <span className="text-[13px] font-medium text-[#f5f5f5]">{guide.title}</span>
                </div>
                {expandedGuide === i ? (
                  <ChevronUp className="w-4 h-4 text-[#555555]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#555555]" />
                )}
              </button>
              {expandedGuide === i && (
                <div className="border-t border-[#222222] px-5 py-4">
                  <div className="prose-like max-w-3xl">
                    {guide.content.split("\n\n").map((para, pi) => {
                      if (para.startsWith("**") && para.endsWith("**")) {
                        return (
                          <h3 key={pi} className="text-[14px] font-semibold text-[#f5f5f5] mt-4 mb-2">
                            {para.replace(/\*\*/g, "")}
                          </h3>
                        );
                      }
                      if (para.includes("```")) {
                        const code = para.replace(/```[a-z]*\n?/g, "").replace(/```$/g, "");
                        return (
                          <pre key={pi} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md px-4 py-3 my-3 text-[12px] text-[#aaa] font-mono overflow-x-auto">
                            {code}
                          </pre>
                        );
                      }
                      const lines = para.split("\n");
                      return (
                        <div key={pi} className="mb-3">
                          {lines.map((line, li) => {
                            if (line.startsWith("- ")) {
                              return (
                                <li key={li} className="text-[13px] text-[#888888] ml-4 my-0.5 list-disc">
                                  {line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1")}
                                </li>
                              );
                            }
                            if (line.startsWith("**") && line.includes("**")) {
                              return (
                                <h4 key={li} className="text-[13px] font-semibold text-[#f5f5f5] mt-3 mb-1">
                                  {line.replace(/\*\*/g, "")}
                                </h4>
                              );
                            }
                            return line ? (
                              <p key={li} className="text-[13px] text-[#888888] leading-relaxed">
                                {line.replace(/`([^`]+)`/g, "$1").replace(/\*\*(.*?)\*\*/g, "$1")}
                              </p>
                            ) : null;
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
