"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Factory, Cpu, Plus, Copy, ChevronDown, ChevronRight, CheckCircle, Loader2, AlertCircle, X } from "lucide-react";

interface Agent {
  agent_id: string;
  name: string;
  role: string;
  type: string;
  division: string;
  model: string;
  skills: string;
  tools: string;
  personality: string;
  status: string;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  role: string;
  division: string;
  description: string;
  skills: string[];
  tools: string[];
  personality: string;
  model: string;
}

const TEMPLATES: Template[] = [
  {
    id: "qa-lead",
    name: "QA Lead",
    role: "Quality Assurance Lead — oversees testing strategy and coordinates QA agents",
    division: "qa",
    description: "Manages the QA division, assigns testing tasks, reviews reports, and maintains quality standards across the product.",
    skills: ["browser-testing", "security-testing", "api-testing", "test-planning"],
    tools: ["browser", "exec", "web_fetch"],
    personality: "Methodical, detail-oriented, high standards. Thinks systematically about coverage.",
    model: "anthropic/claude-opus-4-6",
  },
  {
    id: "functional-qa",
    name: "Functional QA",
    role: "Functional QA Engineer — tests user-facing features and workflows",
    division: "qa",
    description: "Executes functional test cases, reports bugs, verifies fixes, and maintains regression test suites.",
    skills: ["browser-testing", "ui-testing", "regression-testing"],
    tools: ["browser", "exec", "web_fetch"],
    personality: "Thorough, user-focused, communicates bugs clearly with reproducible steps.",
    model: "anthropic/claude-sonnet-4-6",
  },
  {
    id: "security-qa",
    name: "Security QA",
    role: "Security QA Engineer — security testing and vulnerability assessment",
    division: "qa",
    description: "Performs security audits, penetration testing, XSS/SQLi testing, and produces security reports.",
    skills: ["security-testing", "penetration-testing", "owasp"],
    tools: ["browser", "exec", "web_fetch", "web_search"],
    personality: "Skeptical, security-minded, thinks like an attacker to defend like a professional.",
    model: "anthropic/claude-sonnet-4-6",
  },
  {
    id: "general-qa",
    name: "General QA",
    role: "General QA Engineer — broad testing coverage",
    division: "qa",
    description: "Handles general testing tasks including smoke tests, exploratory testing, and ad-hoc verification.",
    skills: ["browser-testing", "api-testing"],
    tools: ["browser", "exec", "web_fetch"],
    personality: "Adaptable, curious, covers broad ground efficiently.",
    model: "anthropic/claude-haiku-4-6",
  },
  {
    id: "product-manager",
    name: "Product Manager",
    role: "Product Manager — product strategy and requirements",
    division: "product",
    description: "Analyzes user needs, defines product requirements, prioritizes features, and writes specs.",
    skills: ["product-strategy", "user-research", "requirements-writing"],
    tools: ["web_search", "web_fetch", "read", "write"],
    personality: "Strategic, user-empathetic, data-driven. Balances stakeholder needs.",
    model: "anthropic/claude-opus-4-6",
  },
  {
    id: "backend-dev",
    name: "Backend Dev",
    role: "Backend Engineer — API and server-side development",
    division: "engineering",
    description: "Designs and builds APIs, database schemas, and server-side logic. Reviews backend code.",
    skills: ["backend-engineering", "database-design", "api-design"],
    tools: ["exec", "read", "write", "edit", "web_search"],
    personality: "Pragmatic, performance-conscious, writes clean maintainable code.",
    model: "anthropic/claude-sonnet-4-6",
  },
  {
    id: "frontend-dev",
    name: "Frontend Dev",
    role: "Frontend Engineer — UI and client-side development",
    division: "engineering",
    description: "Builds responsive UI components, implements designs, and ensures cross-browser compatibility.",
    skills: ["frontend-engineering", "react", "typescript"],
    tools: ["exec", "read", "write", "edit", "browser"],
    personality: "Design-aware, accessibility-conscious, pixel-perfect when it matters.",
    model: "anthropic/claude-sonnet-4-6",
  },
  {
    id: "devops",
    name: "DevOps",
    role: "DevOps Engineer — infrastructure and deployment",
    division: "engineering",
    description: "Manages CI/CD pipelines, Docker containers, infrastructure as code, and deployment automation.",
    skills: ["devops", "docker", "ci-cd", "infrastructure"],
    tools: ["exec", "read", "write", "edit", "web_search"],
    personality: "Automation-first, reliability-obsessed, thinks in systems.",
    model: "anthropic/claude-sonnet-4-6",
  },
  {
    id: "research-analyst",
    name: "Research Analyst",
    role: "Research Analyst — market research and competitive intelligence",
    division: "research",
    description: "Gathers market intelligence, analyzes competitors, synthesizes research into actionable reports.",
    skills: ["research", "data-analysis", "report-writing"],
    tools: ["web_search", "web_fetch", "read", "write"],
    personality: "Curious, analytical, synthesizes complex information clearly.",
    model: "anthropic/claude-sonnet-4-6",
  },
];

interface FormData {
  name: string;
  role: string;
  division: string;
  model: string;
  skills: string;
  tools: string;
  personality: string;
}

const DEFAULT_FORM: FormData = {
  name: "",
  role: "",
  division: "qa",
  model: "anthropic/claude-sonnet-4-6",
  skills: "[]",
  tools: "[]",
  personality: "",
};

type DeployStatus = "idle" | "loading" | "success" | "error";

export default function FactoryPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("idle");
  const [deployMessage, setDeployMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [cloneSource, setCloneSource] = useState<string>("");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deploy-agent");
      const data = await res.json();
      setAgents(data.agents || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const applyTemplate = (template: Template) => {
    setSelectedTemplate(template.id);
    setFormData({
      name: template.name.toLowerCase().replace(/\s+/g, "-"),
      role: template.role,
      division: template.division,
      model: template.model,
      skills: JSON.stringify(template.skills),
      tools: JSON.stringify(template.tools),
      personality: template.personality,
    });
    setShowForm(true);
  };

  const cloneAgent = (agent: Agent) => {
    setCloneSource(agent.agent_id);
    setFormData({
      name: `${agent.agent_id}-clone`,
      role: agent.role,
      division: agent.division,
      model: agent.model,
      skills: agent.skills,
      tools: agent.tools,
      personality: agent.personality,
    });
    setShowForm(true);
    setSelectedTemplate(null);
  };

  const deploy = async () => {
    if (!formData.name || !formData.role) {
      setDeployStatus("error");
      setDeployMessage("Name and role are required.");
      return;
    }
    setDeployStatus("loading");
    try {
      let skills: string[] = [];
      let tools: string[] = [];
      try { skills = JSON.parse(formData.skills); } catch {}
      try { tools = JSON.parse(formData.tools); } catch {}

      const res = await fetch("/api/deploy-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          division: formData.division,
          model: formData.model,
          skills,
          tools,
          personality: formData.personality,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeployStatus("success");
        setDeployMessage(`Agent "${formData.name}" deployed successfully!`);
        setFormData(DEFAULT_FORM);
        setShowForm(false);
        setSelectedTemplate(null);
        setCloneSource("");
        load();
      } else {
        setDeployStatus("error");
        setDeployMessage(data.error || "Deployment failed");
      }
    } catch (e) {
      setDeployStatus("error");
      setDeployMessage("Network error");
    }
    setTimeout(() => setDeployStatus("idle"), 4000);
  };

  const recentAgents = [...agents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <div className="p-6 min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Factory</h1>
          <p className="text-sm text-[#555555] mt-0.5">Create agents from templates or clone existing ones</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-md text-[13px] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Deploy status */}
      {deployStatus !== "idle" && (
        <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-md border text-[13px] ${
          deployStatus === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : deployStatus === "error"
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : "bg-blue-500/10 border-blue-500/20 text-blue-400"
        }`}>
          {deployStatus === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
          {deployStatus === "success" && <CheckCircle className="w-4 h-4" />}
          {deployStatus === "error" && <AlertCircle className="w-4 h-4" />}
          {deployMessage}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Templates + Clone */}
        <div className="col-span-2 space-y-6">
          {/* Templates grid */}
          <div>
            <h2 className="text-[13px] font-medium text-[#f5f5f5] mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#5e6ad2]" />
              Agent Templates
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {TEMPLATES.map((t) => (
                <div
                  key={t.id}
                  className={`bg-[#111111] border rounded-md p-4 cursor-pointer transition-all hover:bg-[#1a1a1a] ${
                    selectedTemplate === t.id ? "border-[#5e6ad2]/50" : "border-[#222222]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[13px] font-medium text-[#f5f5f5]">{t.name}</span>
                    <span className="text-[9px] bg-[#1a1a1a] text-[#555555] px-1.5 py-0.5 rounded capitalize shrink-0">
                      {t.division}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#555555] mb-3 leading-relaxed">{t.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {t.skills.slice(0, 3).map((s) => (
                      <span key={s} className="text-[9px] bg-[#5e6ad2]/10 text-[#5e6ad2] px-1.5 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                    {t.skills.length > 3 && (
                      <span className="text-[9px] text-[#444444]">+{t.skills.length - 3}</span>
                    )}
                  </div>
                  <button
                    onClick={() => applyTemplate(t)}
                    className="w-full bg-[#5e6ad2]/10 hover:bg-[#5e6ad2]/20 text-[#5e6ad2] text-[12px] py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" />
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Clone section */}
          <div>
            <h2 className="text-[13px] font-medium text-[#f5f5f5] mb-3 flex items-center gap-2">
              <Copy className="w-4 h-4 text-[#5e6ad2]" />
              Clone Existing Agent
            </h2>
            <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
              {agents.length === 0 ? (
                <p className="text-[13px] text-[#555555]">No agents available to clone</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {agents.map((agent) => (
                    <div
                      key={agent.agent_id}
                      className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                        cloneSource === agent.agent_id
                          ? "border-[#5e6ad2]/40 bg-[#5e6ad2]/5"
                          : "border-[#222222] hover:border-[#333333] hover:bg-[#1a1a1a]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] text-[#f5f5f5] truncate">{agent.name}</p>
                        <p className="text-[10px] text-[#555555] truncate">{agent.division}</p>
                      </div>
                      <button
                        onClick={() => cloneAgent(agent)}
                        className="text-[11px] text-[#5e6ad2] hover:text-[#7b85e0] ml-3 shrink-0 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Clone
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Form + Recent */}
        <div className="space-y-5">
          {/* Create form */}
          {showForm && (
            <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-medium text-[#f5f5f5]">
                  {cloneSource ? `Clone: ${cloneSource}` : selectedTemplate ? `From: ${TEMPLATES.find((t) => t.id === selectedTemplate)?.name}` : "Create Agent"}
                </h3>
                <button onClick={() => { setShowForm(false); setSelectedTemplate(null); setCloneSource(""); }} className="text-[#555555] hover:text-[#f5f5f5]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#555555] mb-1">Agent ID / Name</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                    className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] outline-none focus:border-[#333333]"
                    placeholder="my-agent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#555555] mb-1">Role</label>
                  <textarea
                    value={formData.role}
                    onChange={(e) => setFormData((d) => ({ ...d, role: e.target.value }))}
                    rows={2}
                    className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] outline-none focus:border-[#333333] resize-none"
                    placeholder="Describe agent's role..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#555555] mb-1">Division</label>
                    <select
                      value={formData.division}
                      onChange={(e) => setFormData((d) => ({ ...d, division: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#888888] outline-none focus:border-[#333333]"
                    >
                      <option value="qa">QA</option>
                      <option value="engineering">Engineering</option>
                      <option value="product">Product</option>
                      <option value="research">Research</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#555555] mb-1">Model</label>
                    <select
                      value={formData.model}
                      onChange={(e) => setFormData((d) => ({ ...d, model: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#888888] outline-none focus:border-[#333333]"
                    >
                      <option value="anthropic/claude-opus-4-6">Claude Opus</option>
                      <option value="anthropic/claude-sonnet-4-6">Claude Sonnet</option>
                      <option value="anthropic/claude-haiku-4-6">Claude Haiku</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#555555] mb-1">Personality</label>
                  <textarea
                    value={formData.personality}
                    onChange={(e) => setFormData((d) => ({ ...d, personality: e.target.value }))}
                    rows={2}
                    className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] outline-none focus:border-[#333333] resize-none"
                    placeholder="Agent personality traits..."
                  />
                </div>
                <button
                  onClick={deploy}
                  disabled={deployStatus === "loading"}
                  className="w-full bg-[#5e6ad2] hover:bg-[#6b78e0] disabled:opacity-50 text-white text-[13px] font-medium py-2 rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  {deployStatus === "loading" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Deploying...</>
                  ) : (
                    <><Plus className="w-4 h-4" />Deploy Agent</>
                  )}
                </button>
              </div>
            </div>
          )}

          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setSelectedTemplate(null); setCloneSource(""); setFormData(DEFAULT_FORM); }}
              className="w-full bg-[#111111] border border-dashed border-[#333333] hover:border-[#5e6ad2]/50 hover:bg-[#5e6ad2]/5 text-[#555555] hover:text-[#5e6ad2] text-[13px] py-3 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create from Scratch
            </button>
          )}

          {/* Recently created */}
          <div>
            <h3 className="text-[13px] font-medium text-[#f5f5f5] mb-3">Recently Created</h3>
            <div className="space-y-2">
              {recentAgents.length === 0 ? (
                <div className="bg-[#111111] border border-[#222222] rounded-md p-4 text-center">
                  <p className="text-[12px] text-[#555555]">No agents yet</p>
                </div>
              ) : (
                recentAgents.map((agent) => (
                  <div key={agent.agent_id} className="bg-[#111111] border border-[#222222] rounded-md px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#f5f5f5]">{agent.name}</span>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full">{agent.status}</span>
                    </div>
                    <p className="text-[10px] text-[#555555] truncate mt-0.5">{agent.division}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
