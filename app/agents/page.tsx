"use client";

import { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Bot,
  Shield,
  Bug,
  Cpu,
  ArrowLeft,
  Pencil,
  Trash2,
  Users,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { MODELS, DIVISIONS, modelRecommendation, defaultPersonality } from "@/lib/agent-models";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  requiredTools: string[];
}

interface Tool {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface Agent {
  agent_id: string;
  name: string;
  role: string;
  type: string;
  division: string;
  lead: string;
  model: string;
  workspace: string;
  skills: string[];
  tools: string[];
  personality?: string;
  created: string;
  status: string;
}

interface CronJob {
  schedule: string;
  description: string;
}

type PageView = "list" | "detail" | "create" | "edit";

// ─── Agent Type Icons ─────────────────────────────────────────────────────────

function agentIcon(agent: Agent) {
  if (agent.agent_id === "main") return <Cpu className="w-4 h-4" />;
  if (agent.division?.includes("Security")) return <Shield className="w-4 h-4" />;
  if (agent.division?.includes("QA")) return <Bug className="w-4 h-4" />;
  return <Bot className="w-4 h-4" />;
}

function statusColor(status: string) {
  if (status === "active") return "bg-emerald-500";
  if (status === "retired") return "bg-red-500";
  return "bg-yellow-500";
}

function modelShortName(model: string) {
  return model
    .replace("anthropic/", "")
    .replace("claude-", "")
    .replace("-20250514", "");
}

// ─── Agent List View ──────────────────────────────────────────────────────────

function AgentListView({
  agents,
  onSelect,
  onCreate,
}: {
  agents: Agent[];
  onSelect: (agent: Agent) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filterDivision, setFilterDivision] = useState<string>("all");

  const divisions = Array.from(new Set(agents.map((a) => a.division).filter(Boolean)));
  const activeAgents = agents.filter((a) => a.status !== "retired");
  const retiredAgents = agents.filter((a) => a.status === "retired");

  const filtered = activeAgents.filter((a) => {
    const matchesQuery =
      !query ||
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.role.toLowerCase().includes(query.toLowerCase()) ||
      a.agent_id.toLowerCase().includes(query.toLowerCase());
    const matchesDivision = filterDivision === "all" || a.division === filterDivision;
    return matchesQuery && matchesDivision;
  });

  // Group by division
  const grouped = filtered.reduce<Record<string, Agent[]>>((acc, a) => {
    const div = a.division || "Independent";
    (acc[div] = acc[div] || []).push(a);
    return acc;
  }, {});

  // Put "none" (main orchestrator) first
  const sortedDivisions = Object.keys(grouped).sort((a, b) => {
    if (a === "none") return -1;
    if (b === "none") return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Agents</h1>
          <p className="text-sm text-[#555555] mt-0.5">
            {activeAgents.length} active agent{activeAgents.length !== 1 ? "s" : ""}
            {retiredAgents.length > 0 && (
              <span> · {retiredAgents.length} retired</span>
            )}
          </p>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white font-medium transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New Agent
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555555]" />
          <input
            className="w-full bg-[#111111] border border-[#222222] rounded-md pl-8 pr-3 py-1.5 text-[13px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors"
            placeholder="Search agents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {divisions.length > 1 && (
          <select
            className="bg-[#111111] border border-[#222222] rounded-md px-3 py-1.5 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2] transition-colors"
            value={filterDivision}
            onChange={(e) => setFilterDivision(e.target.value)}
          >
            <option value="all">All divisions</option>
            {divisions.map((d) => (
              <option key={d} value={d}>
                {d === "none" ? "Core" : d}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Agent Groups */}
      {sortedDivisions.map((division) => (
        <div key={division}>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-3.5 h-3.5 text-[#555555]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#555555]">
              {division === "none" ? "Core" : division}
            </span>
            <span className="text-[11px] text-[#444444]">
              ({grouped[division].length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {grouped[division].map((agent) => (
              <button
                key={agent.agent_id}
                onClick={() => onSelect(agent)}
                className="text-left bg-[#111111] border border-[#222222] rounded-md p-4 hover:border-[#333333] hover:bg-[#141414] transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={clsx(
                      "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                      agent.agent_id === "main"
                        ? "bg-[#5e6ad2]/15 text-[#5e6ad2]"
                        : "bg-[#1a1a1a] text-[#888888] group-hover:text-[#f5f5f5]"
                    )}
                  >
                    {agentIcon(agent)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-medium text-[#f5f5f5] truncate">
                        {agent.name}
                      </span>
                      <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", statusColor(agent.status))} />
                    </div>
                    <p className="text-[12px] text-[#888888] line-clamp-2 leading-relaxed mb-2">
                      {agent.role}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#1a1a1a] text-[#888888] font-mono">
                        {modelShortName(agent.model)}
                      </span>
                      {agent.skills && agent.skills.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#1a1a1a] text-[#666666]">
                          {agent.skills.length} skill{agent.skills.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {agent.tools && agent.tools.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#1a1a1a] text-[#666666]">
                          {agent.tools.length} tool{agent.tools.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#333333] group-hover:text-[#555555] shrink-0 mt-1 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Bot className="w-8 h-8 text-[#333333] mx-auto mb-3" />
          <p className="text-[13px] text-[#555555]">
            {query ? "No agents match your search" : "No agents yet"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Agent Detail View ────────────────────────────────────────────────────────

function AgentDetailView({
  agent,
  agents,
  onBack,
  onEdit,
  onRetire,
  retiring,
}: {
  agent: Agent;
  agents: Agent[];
  onBack: () => void;
  onEdit: () => void;
  onRetire: () => void;
  retiring: boolean;
}) {
  const [showRetireConfirm, setShowRetireConfirm] = useState(false);
  const modelInfo = MODELS.find((m) => agent.model?.includes(m.id));
  const reportsToAgent = agents.find((a) => a.agent_id === agent.lead);
  const subordinates = agents.filter(
    (a) => a.lead === agent.agent_id && a.agent_id !== agent.agent_id && a.status === "active"
  );
  const isMain = agent.agent_id === "main";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] text-[#888888] hover:text-[#f5f5f5] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Agents
        </button>
        {!isMain && (
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => setShowRetireConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-[#888888] hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Retire
            </button>
          </div>
        )}
      </div>

      {/* Retire Confirmation */}
      {showRetireConfirm && (
        <div className="bg-red-500/8 border border-red-500/25 rounded-md p-4">
          <p className="text-[13px] text-red-400 mb-3">
            Retire <strong>{agent.name}</strong>? This will remove it from the active roster and gateway config.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onRetire();
                setShowRetireConfirm(false);
              }}
              disabled={retiring}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all disabled:opacity-50"
            >
              {retiring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Confirm Retire
            </button>
            <button
              onClick={() => setShowRetireConfirm(false)}
              className="px-3 py-1.5 rounded-md text-[13px] text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Agent Header Card */}
      <div className="bg-[#111111] border border-[#222222] rounded-md p-5">
        <div className="flex items-start gap-4">
          <div
            className={clsx(
              "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
              isMain
                ? "bg-[#5e6ad2]/15 text-[#5e6ad2]"
                : "bg-[#1a1a1a] text-[#888888]"
            )}
          >
            {agentIcon(agent)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-[#f5f5f5]">{agent.name}</h2>
              <div className={clsx("w-2 h-2 rounded-full", statusColor(agent.status))} />
              <span className="text-[11px] text-[#555555] capitalize">{agent.status}</span>
            </div>
            <p className="text-[13px] text-[#888888] leading-relaxed mb-3">{agent.role}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] px-2 py-0.5 rounded-sm bg-[#1a1a1a] text-[#888888] font-mono">
                {agent.agent_id}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-sm bg-[#1a1a1a] text-[#888888]">
                {agent.division === "none" ? "Core" : agent.division}
              </span>
              <span className="text-[11px] text-[#555555]">
                Created {agent.created}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Model */}
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#555555] mb-3">Model</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#f5f5f5] font-medium">
                {modelInfo?.name || modelShortName(agent.model)}
              </span>
              {modelInfo && (
                <span
                  className={clsx(
                    "text-[10px] px-1.5 py-0.5 rounded-sm bg-[#1a1a1a]",
                    modelInfo.costTier === "high"
                      ? "text-amber-400"
                      : modelInfo.costTier === "medium"
                      ? "text-[#5e6ad2]"
                      : "text-emerald-500"
                  )}
                >
                  {modelInfo.costTier} cost
                </span>
              )}
            </div>
            {modelInfo && (
              <p className="text-[12px] text-[#666666]">{modelInfo.description}</p>
            )}
            <p className="text-[11px] text-[#444444] font-mono">{agent.model}</p>
          </div>
        </div>

        {/* Hierarchy */}
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#555555] mb-3">Hierarchy</h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#555555]">Reports to</span>
              <span className="text-[12px] text-[#f5f5f5]">
                {reportsToAgent ? reportsToAgent.name : isMain ? "User (Samvel)" : "Main (Gvenik)"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#555555]">Type</span>
              <span className="text-[12px] text-[#888888] capitalize">{agent.type}</span>
            </div>
            {subordinates.length > 0 && (
              <div>
                <span className="text-[12px] text-[#555555]">Manages</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {subordinates.map((s) => (
                    <span
                      key={s.agent_id}
                      className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#1a1a1a] text-[#888888]"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skills */}
      {agent.skills && agent.skills.length > 0 && (
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#555555] mb-3">
            Skills ({agent.skills.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {agent.skills.map((s) => (
              <span
                key={s}
                className="text-[11px] px-2 py-1 rounded-md bg-[#1a1a1a] border border-[#222222] text-[#888888]"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tools */}
      {agent.tools && agent.tools.length > 0 && (
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#555555] mb-3">
            Tools ({agent.tools.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {agent.tools.map((t) => (
              <span
                key={t}
                className="text-[11px] px-2 py-1 rounded-md bg-[#1a1a1a] border border-[#222222] text-[#888888] font-mono"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Personality */}
      {agent.personality && (
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#555555] mb-3">
            Personality
          </h3>
          <p className="text-[12px] text-[#888888] leading-relaxed">{agent.personality}</p>
        </div>
      )}

      {/* Workspace */}
      <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
        <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#555555] mb-3">
          Workspace
        </h3>
        <p className="text-[12px] text-[#888888] font-mono">{agent.workspace}</p>
      </div>
    </div>
  );
}

// ─── Step Indicator (Create Wizard) ───────────────────────────────────────────

const STEPS = ["Identity", "Skills", "Tools", "Config", "Review"];

function StepIndicator({
  current,
  completed,
  onNav,
}: {
  current: number;
  completed: Set<number>;
  onNav: (step: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isDone = completed.has(stepNum);
        const canNav = isDone && stepNum !== current;
        return (
          <div key={label} className="flex items-center gap-1">
            <button
              onClick={() => canNav && onNav(stepNum)}
              disabled={!canNav && !isActive}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-all",
                isActive
                  ? "bg-[#5e6ad2]/15 text-[#5e6ad2] border border-[#5e6ad2]/30"
                  : isDone
                  ? "text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] cursor-pointer border border-transparent"
                  : "text-[#555555] border border-transparent cursor-default"
              )}
            >
              <span
                className={clsx(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0",
                  isActive
                    ? "bg-[#5e6ad2] text-white"
                    : isDone
                    ? "bg-[#222222] text-[#888888]"
                    : "bg-[#1a1a1a] text-[#555555]"
                )}
              >
                {isDone && !isActive ? <Check className="w-2.5 h-2.5" /> : stepNum}
              </span>
              <span className="hidden sm:block">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-3 h-3 text-[#333333] shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Identity ─────────────────────────────────────────────────────────

function Step1({
  data,
  onChange,
  agents,
}: {
  data: {
    name: string;
    agentId: string;
    role: string;
    division: string;
    reportsTo: string;
    agentIdManuallyEdited: boolean;
  };
  onChange: (patch: Partial<typeof data>) => void;
  agents: Agent[];
}) {
  const toKebab = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
            Agent Name <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors"
            placeholder="e.g. Senior QA Engineer"
            value={data.name}
            onChange={(e) => {
              const name = e.target.value;
              const patch: Partial<typeof data> = { name };
              if (!data.agentIdManuallyEdited) {
                patch.agentId = toKebab(name);
              }
              onChange(patch);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
            Agent ID <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#555555] font-mono focus:outline-none focus:border-[#5e6ad2] transition-colors"
            placeholder="kebab-case-id"
            value={data.agentId}
            onChange={(e) => onChange({ agentId: e.target.value, agentIdManuallyEdited: true })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
          Role Description <span className="text-red-500">*</span>
        </label>
        <textarea
          className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors resize-none"
          placeholder="1–2 sentences describing what this agent does and specializes in."
          rows={2}
          value={data.role}
          onChange={(e) => onChange({ role: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
            Division
          </label>
          <select
            className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2] transition-colors"
            value={data.division}
            onChange={(e) => onChange({ division: e.target.value })}
          >
            <option value="">Select division…</option>
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
            Reports To
          </label>
          <select
            className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2] transition-colors"
            value={data.reportsTo}
            onChange={(e) => onChange({ reportsTo: e.target.value })}
          >
            <option value="">None (reports to main)</option>
            {agents.map((a) => (
              <option key={a.agent_id} value={a.agent_id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Skills ───────────────────────────────────────────────────────────

function Step2({
  skills,
  selected,
  onToggle,
}: {
  skills: Skill[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = query
    ? skills.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.description.toLowerCase().includes(query.toLowerCase()) ||
          s.category.toLowerCase().includes(query.toLowerCase())
      )
    : skills;

  const grouped = filtered.reduce<Record<string, Skill[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555555]" />
          <input
            className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md pl-8 pr-3 py-1.5 text-[13px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors"
            placeholder="Search skills…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {selected.length > 0 && (
          <span className="text-[12px] text-[#5e6ad2] font-medium">
            {selected.length} selected
          </span>
        )}
      </div>

      <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium mb-2">
              {category}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {items.map((skill) => {
                const isSelected = selected.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    onClick={() => onToggle(skill.id)}
                    className={clsx(
                      "text-left p-3 rounded-md border transition-all",
                      isSelected
                        ? "border-[#5e6ad2] bg-[#5e6ad2]/8"
                        : "border-[#222222] bg-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#1f1f1f]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[13px] font-medium text-[#f5f5f5] leading-snug">
                        {skill.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[#5e6ad2] shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-[12px] text-[#888888] leading-snug line-clamp-2">
                      {skill.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-[13px] text-[#555555] text-center py-8">No skills match your search.</p>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Tools ────────────────────────────────────────────────────────────

function Step3({
  tools,
  selected,
  required,
  onToggle,
}: {
  tools: Tool[];
  selected: string[];
  required: string[];
  onToggle: (id: string) => void;
}) {
  const grouped = tools.reduce<Record<string, Tool[]>>((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888888]">
          {selected.length} tool{selected.length !== 1 ? "s" : ""} selected
          {required.length > 0 && (
            <span className="text-[#555555]"> · {required.length} auto-required by skills</span>
          )}
        </p>
      </div>

      <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium mb-2">
              {category}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {items.map((tool) => {
                const isSelected = selected.includes(tool.id);
                const isRequired = required.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    onClick={() => !isRequired && onToggle(tool.id)}
                    disabled={isRequired}
                    className={clsx(
                      "text-left p-3 rounded-md border transition-all",
                      isSelected && isRequired
                        ? "border-[#5e6ad2]/50 bg-[#5e6ad2]/5 opacity-80"
                        : isSelected
                        ? "border-[#5e6ad2] bg-[#5e6ad2]/8"
                        : "border-[#222222] bg-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#1f1f1f]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[13px] font-medium text-[#f5f5f5] leading-snug">
                        {tool.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isRequired && (
                          <span className="text-[9px] px-1 py-0.5 rounded-sm bg-[#5e6ad2]/20 text-[#5e6ad2]">
                            required
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#5e6ad2]" />}
                      </div>
                    </div>
                    <p className="text-[12px] text-[#888888] leading-snug line-clamp-2">
                      {tool.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 4: Config ───────────────────────────────────────────────────────────

function Step4({
  data,
  onChange,
}: {
  data: {
    model: string;
    personality: string;
    cronJobs: CronJob[];
    division: string;
  };
  onChange: (patch: Partial<typeof data>) => void;
}) {
  const [newCron, setNewCron] = useState({ schedule: "", description: "" });

  const costColors: Record<string, string> = {
    high: "text-amber-400",
    medium: "text-[#5e6ad2]",
    low: "text-emerald-500",
  };

  const recommendation = modelRecommendation(data.division);

  const addCron = () => {
    if (!newCron.schedule.trim()) return;
    onChange({ cronJobs: [...data.cronJobs, newCron] });
    setNewCron({ schedule: "", description: "" });
  };

  const removeCron = (idx: number) => {
    const updated = data.cronJobs.filter((_, i) => i !== idx);
    onChange({ cronJobs: updated });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
          Model <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {MODELS.map((m) => {
            const isSelected = data.model === m.id;
            const isRecommended = m.id === recommendation;
            return (
              <button
                key={m.id}
                onClick={() => onChange({ model: m.id })}
                className={clsx(
                  "w-full text-left p-3 rounded-md border transition-all flex items-start gap-3",
                  isSelected
                    ? "border-[#5e6ad2] bg-[#5e6ad2]/8"
                    : "border-[#222222] bg-[#1a1a1a] hover:border-[#2a2a2a]"
                )}
              >
                <div
                  className={clsx(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                    isSelected ? "border-[#5e6ad2]" : "border-[#333333]"
                  )}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-[#5e6ad2]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-medium text-[#f5f5f5]">{m.name}</span>
                    {isRecommended && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-[#5e6ad2]/20 text-[#5e6ad2]">
                        recommended
                      </span>
                    )}
                    <span
                      className={clsx(
                        "text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] ml-auto",
                        costColors[m.costTier]
                      )}
                    >
                      {m.costTier} cost
                    </span>
                  </div>
                  <p className="text-[12px] text-[#888888]">{m.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
          Personality
        </label>
        <textarea
          className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors resize-none"
          placeholder="Describe the agent's personality and working style…"
          rows={3}
          value={data.personality}
          onChange={(e) => onChange({ personality: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
          Schedule (optional)
        </label>
        {data.cronJobs.length > 0 && (
          <div className="space-y-1 mb-2">
            {data.cronJobs.map((job, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-2"
              >
                <Clock className="w-3.5 h-3.5 text-[#555555] shrink-0" />
                <span className="text-[12px] font-mono text-[#5e6ad2] shrink-0">{job.schedule}</span>
                {job.description && (
                  <span className="text-[12px] text-[#888888] flex-1 truncate">
                    {job.description}
                  </span>
                )}
                <button onClick={() => removeCron(i)} className="ml-auto text-[#555555] hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className="bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-1.5 text-[12px] font-mono text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors w-36"
            placeholder="0 9 * * 1"
            value={newCron.schedule}
            onChange={(e) => setNewCron({ ...newCron, schedule: e.target.value })}
          />
          <input
            className="flex-1 bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-1.5 text-[12px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors"
            placeholder="Description (optional)"
            value={newCron.description}
            onChange={(e) => setNewCron({ ...newCron, description: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && addCron()}
          />
          <button
            onClick={addCron}
            className="bg-[#222222] hover:bg-[#2a2a2a] text-[#888888] hover:text-[#f5f5f5] px-2.5 py-1.5 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Review & Deploy ───────────────────────────────────────────────────

function Step5({
  identity,
  skills,
  tools,
  config,
  skillList,
  toolList,
  agentList,
  onDeploy,
  deploying,
  result,
}: {
  identity: {
    name: string;
    agentId: string;
    role: string;
    division: string;
    reportsTo: string;
  };
  skills: string[];
  tools: string[];
  config: { model: string; personality: string; cronJobs: CronJob[] };
  skillList: Skill[];
  toolList: Tool[];
  agentList: Agent[];
  onDeploy: () => void;
  deploying: boolean;
  result: { success: boolean; message: string } | null;
}) {
  const modelInfo = MODELS.find((m) => m.id === config.model);
  const reportsToName =
    agentList.find((a) => a.agent_id === identity.reportsTo)?.name || "Main (Gvenik)";
  const selectedSkillNames = skillList
    .filter((s) => skills.includes(s.id))
    .map((s) => s.name);
  const selectedToolNames = toolList
    .filter((t) => tools.includes(t.id))
    .map((t) => t.name);

  return (
    <div className="space-y-4">
      {result && (
        <div
          className={clsx(
            "flex items-start gap-3 p-3 rounded-md border text-[13px]",
            result.success
              ? "bg-emerald-500/8 border-emerald-500/25 text-emerald-400"
              : "bg-red-500/8 border-red-500/25 text-red-400"
          )}
        >
          {result.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div>
            <p>{result.message}</p>
          </div>
        </div>
      )}

      <div className="bg-[#1a1a1a] border border-[#222222] rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-[#222222] flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#f5f5f5]">{identity.name}</span>
          <span className="text-[10px] font-mono text-[#555555]">{identity.agentId}</span>
        </div>

        <div className="divide-y divide-[#222222]">
          <Row label="Role" value={identity.role} />
          <Row label="Division" value={identity.division || "—"} />
          <Row label="Reports To" value={reportsToName} />
          <Row label="Model" value={modelInfo?.name || config.model} />
          <Row
            label="Skills"
            value={
              selectedSkillNames.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedSkillNames.map((n) => (
                    <Badge key={n} label={n} />
                  ))}
                </div>
              ) : (
                <span className="text-[#555555]">None</span>
              )
            }
          />
          <Row
            label="Tools"
            value={
              selectedToolNames.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedToolNames.map((n) => (
                    <Badge key={n} label={n} />
                  ))}
                </div>
              ) : (
                <span className="text-[#555555]">None</span>
              )
            }
          />
          {config.personality && (
            <Row label="Personality" value={config.personality} />
          )}
          {config.cronJobs.length > 0 && (
            <Row
              label="Schedule"
              value={
                <div className="space-y-0.5">
                  {config.cronJobs.map((j, i) => (
                    <p key={i} className="text-[12px]">
                      <span className="font-mono text-[#5e6ad2]">{j.schedule}</span>
                      {j.description && (
                        <span className="text-[#888888] ml-2">{j.description}</span>
                      )}
                    </p>
                  ))}
                </div>
              }
            />
          )}
        </div>
      </div>

      <button
        onClick={onDeploy}
        disabled={deploying || result?.success}
        className={clsx(
          "w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-[13px] font-medium transition-all",
          result?.success
            ? "bg-emerald-500/20 text-emerald-400 cursor-default"
            : "bg-[#5e6ad2] hover:bg-[#6c78e0] text-white disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {deploying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Deploying…
          </>
        ) : result?.success ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Deployed
          </>
        ) : (
          "Deploy Agent"
        )}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 px-4 py-2.5">
      <span className="text-[12px] text-[#555555] w-24 shrink-0">{label}</span>
      <span className="text-[12px] text-[#f5f5f5] flex-1">{value}</span>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888]">
      {label}
    </span>
  );
}

// ─── Edit Agent View ──────────────────────────────────────────────────────────

function EditAgentView({
  agent,
  agents,
  skills: initialSkills,
  tools: initialTools,
  onBack,
  onSaved,
}: {
  agent: Agent;
  agents: Agent[];
  skills: Skill[];
  tools: Tool[];
  onBack: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [division, setDivision] = useState(agent.division || "");
  const [reportsTo, setReportsTo] = useState(agent.lead || "");
  const [model, setModel] = useState(
    agent.model?.replace("anthropic/", "") || "claude-sonnet-4-6"
  );
  const [personality, setPersonality] = useState(agent.personality || "");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(agent.skills || []);
  const [selectedTools, setSelectedTools] = useState<string[]>(agent.tools || []);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Live registry lists (refreshable after add/delete)
  const [allSkills, setAllSkills] = useState<Skill[]>(initialSkills);
  const [allTools, setAllTools] = useState<Tool[]>(initialTools);

  // Inline add forms
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: "", id: "", category: "", description: "", requiredTools: "" as string, promptAdditions: "" });
  const [showAddTool, setShowAddTool] = useState(false);
  const [newTool, setNewTool] = useState({ name: "", id: "", category: "", description: "" });

  const refreshSkills = () =>
    fetch("/api/skills").then((r) => r.json()).then(setAllSkills).catch(() => {});
  const refreshTools = () =>
    fetch("/api/tools").then((r) => r.json()).then(setAllTools).catch(() => {});

  const otherAgents = agents.filter(
    (a) => a.agent_id !== agent.agent_id && a.status === "active"
  );

  const costColors: Record<string, string> = {
    high: "text-amber-400",
    medium: "text-[#5e6ad2]",
    low: "text-emerald-500",
  };

  const toggleSkill = (id: string) =>
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const toggleTool = (id: string) =>
    setSelectedTools((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const toKebab = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

  const handleAddSkill = async () => {
    if (!newSkill.name.trim() || !newSkill.category.trim()) return;
    const id = newSkill.id.trim() || toKebab(newSkill.name);
    await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: newSkill.name,
        category: newSkill.category,
        description: newSkill.description,
        requiredTools: newSkill.requiredTools.split(",").map((s) => s.trim()).filter(Boolean),
        promptAdditions: newSkill.promptAdditions,
      }),
    });
    await refreshSkills();
    setSelectedSkills((prev) => [...prev, id]);
    setNewSkill({ name: "", id: "", category: "", description: "", requiredTools: "", promptAdditions: "" });
    setShowAddSkill(false);
  };

  const handleDeleteSkill = async (id: string) => {
    await fetch("/api/skills", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refreshSkills();
    setSelectedSkills((prev) => prev.filter((s) => s !== id));
  };

  const handleAddTool = async () => {
    if (!newTool.name.trim()) return;
    const id = newTool.id.trim() || toKebab(newTool.name);
    await fetch("/api/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: newTool.name,
        category: newTool.category || "Custom",
        description: newTool.description,
      }),
    });
    await refreshTools();
    setSelectedTools((prev) => [...prev, id]);
    setNewTool({ name: "", id: "", category: "", description: "" });
    setShowAddTool(false);
  };

  const handleDeleteTool = async (id: string) => {
    await fetch("/api/tools", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refreshTools();
    setSelectedTools((prev) => prev.filter((t) => t !== id));
  };

  const save = async () => {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/deploy-agent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.agent_id,
          name,
          role,
          division,
          reportsTo,
          model,
          personality,
          skills: selectedSkills,
          tools: selectedTools,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({ success: true, message: data.message || "Agent updated." });
        setTimeout(() => onSaved(), 1000);
      } else {
        setResult({ success: false, message: data.error || "Update failed." });
      }
    } catch (e: any) {
      setResult({ success: false, message: e.message || "Network error." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] text-[#888888] hover:text-[#f5f5f5] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">
            Edit {agent.name}
          </h1>
          <p className="text-sm text-[#555555] mt-0.5 font-mono">{agent.agent_id}</p>
        </div>
      </div>

      {/* Result banner */}
      {result && (
        <div
          className={clsx(
            "flex items-start gap-3 p-3 rounded-md border text-[13px]",
            result.success
              ? "bg-emerald-500/8 border-emerald-500/25 text-emerald-400"
              : "bg-red-500/8 border-red-500/25 text-red-400"
          )}
        >
          {result.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <p>{result.message}</p>
        </div>
      )}

      {/* Identity */}
      <div className="bg-[#111111] border border-[#222222] rounded-md p-5 space-y-4">
        <h2 className="text-[13px] font-semibold text-[#f5f5f5]">Identity</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
              Name
            </label>
            <input
              className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2] transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
              Agent ID
            </label>
            <input
              className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#555555] font-mono cursor-not-allowed"
              value={agent.agent_id}
              disabled
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
            Role Description
          </label>
          <textarea
            className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2] transition-colors resize-none"
            rows={2}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
              Division
            </label>
            <select
              className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2] transition-colors"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            >
              <option value="">Select division…</option>
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">
              Reports To
            </label>
            <select
              className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2] transition-colors"
              value={reportsTo}
              onChange={(e) => setReportsTo(e.target.value)}
            >
              <option value="">None (reports to main)</option>
              {otherAgents.map((a) => (
                <option key={a.agent_id} value={a.agent_id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Model */}
      <div className="bg-[#111111] border border-[#222222] rounded-md p-5 space-y-3">
        <h2 className="text-[13px] font-semibold text-[#f5f5f5]">Model</h2>
        <div className="space-y-2">
          {MODELS.map((m) => {
            const isSelected = model === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={clsx(
                  "w-full text-left p-3 rounded-md border transition-all flex items-start gap-3",
                  isSelected
                    ? "border-[#5e6ad2] bg-[#5e6ad2]/8"
                    : "border-[#222222] bg-[#1a1a1a] hover:border-[#2a2a2a]"
                )}
              >
                <div
                  className={clsx(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                    isSelected ? "border-[#5e6ad2]" : "border-[#333333]"
                  )}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-[#5e6ad2]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-medium text-[#f5f5f5]">{m.name}</span>
                    <span
                      className={clsx(
                        "text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] ml-auto",
                        costColors[m.costTier]
                      )}
                    >
                      {m.costTier} cost
                    </span>
                  </div>
                  <p className="text-[12px] text-[#888888]">{m.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Personality */}
      <div className="bg-[#111111] border border-[#222222] rounded-md p-5 space-y-3">
        <h2 className="text-[13px] font-semibold text-[#f5f5f5]">Personality</h2>
        <textarea
          className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors resize-none"
          placeholder="Describe the agent's personality and working style…"
          rows={3}
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
        />
      </div>

      {/* Skills */}
      <div className="bg-[#111111] border border-[#222222] rounded-md p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-[#f5f5f5]">Skills</h2>
          <div className="flex items-center gap-3">
            {selectedSkills.length > 0 && (
              <span className="text-[12px] text-[#5e6ad2] font-medium">
                {selectedSkills.length} selected
              </span>
            )}
            <button
              onClick={() => setShowAddSkill(!showAddSkill)}
              className="flex items-center gap-1 text-[12px] text-[#5e6ad2] hover:text-[#6c78e0] transition-colors"
            >
              {showAddSkill ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {showAddSkill ? "Cancel" : "Add New"}
            </button>
          </div>
        </div>

        {/* Inline add skill form */}
        {showAddSkill && (
          <div className="bg-[#0a0a0a] border border-[#5e6ad2]/30 rounded-md p-4 space-y-3">
            <p className="text-[11px] font-medium text-[#5e6ad2] uppercase tracking-wider">New Skill</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-1.5 text-[12px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                placeholder="Skill name *"
                value={newSkill.name}
                onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value, id: toKebab(e.target.value) })}
              />
              <input
                className="bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-1.5 text-[12px] text-[#f5f5f5] placeholder-[#555555] font-mono focus:outline-none focus:border-[#5e6ad2] transition-colors"
                placeholder="ID (auto-generated)"
                value={newSkill.id}
                onChange={(e) => setNewSkill({ ...newSkill, id: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-1.5 text-[12px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                placeholder="Category * (e.g. QA & Testing)"
                value={newSkill.category}
                onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
              />
              <input
                className="bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-1.5 text-[12px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                placeholder="Required tools (comma-separated)"
                value={newSkill.requiredTools}
                onChange={(e) => setNewSkill({ ...newSkill, requiredTools: e.target.value })}
              />
            </div>
            <textarea
              className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-1.5 text-[12px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors resize-none"
              placeholder="Description"
              rows={2}
              value={newSkill.description}
              onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
            />
            <textarea
              className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-1.5 text-[12px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors resize-none"
              placeholder="Prompt additions (system prompt text for this skill)"
              rows={2}
              value={newSkill.promptAdditions}
              onChange={(e) => setNewSkill({ ...newSkill, promptAdditions: e.target.value })}
            />
            <button
              onClick={handleAddSkill}
              disabled={!newSkill.name.trim() || !newSkill.category.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Plus className="w-3 h-3" />
              Add to Registry
            </button>
          </div>
        )}

        {allSkills.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {allSkills.map((skill) => {
              const isSelected = selectedSkills.includes(skill.id);
              return (
                <div
                  key={skill.id}
                  className={clsx(
                    "relative text-left p-3 rounded-md border transition-all group",
                    isSelected
                      ? "border-[#5e6ad2] bg-[#5e6ad2]/8"
                      : "border-[#222222] bg-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#1f1f1f]"
                  )}
                >
                  <button
                    onClick={() => toggleSkill(skill.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[13px] font-medium text-[#f5f5f5] leading-snug">
                        {skill.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[#5e6ad2] shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-[12px] text-[#888888] leading-snug line-clamp-2">
                      {skill.description}
                    </p>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove "${skill.name}" from registry?`)) handleDeleteSkill(skill.id);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-md text-[#333333] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove from registry"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[12px] text-[#555555]">No skills in registry. Add one above.</p>
        )}
      </div>

      {/* Tools */}
      <div className="bg-[#111111] border border-[#222222] rounded-md p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-[#f5f5f5]">Tools</h2>
          <div className="flex items-center gap-3">
            {selectedTools.length > 0 && (
              <span className="text-[12px] text-[#5e6ad2] font-medium">
                {selectedTools.length} selected
              </span>
            )}
            <button
              onClick={() => setShowAddTool(!showAddTool)}
              className="flex items-center gap-1 text-[12px] text-[#5e6ad2] hover:text-[#6c78e0] transition-colors"
            >
              {showAddTool ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {showAddTool ? "Cancel" : "Add New"}
            </button>
          </div>
        </div>

        {/* Inline add tool form */}
        {showAddTool && (
          <div className="bg-[#0a0a0a] border border-[#5e6ad2]/30 rounded-md p-4 space-y-3">
            <p className="text-[11px] font-medium text-[#5e6ad2] uppercase tracking-wider">New Tool</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-1.5 text-[12px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                placeholder="Tool name *"
                value={newTool.name}
                onChange={(e) => setNewTool({ ...newTool, name: e.target.value, id: toKebab(e.target.value) })}
              />
              <input
                className="bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-1.5 text-[12px] text-[#f5f5f5] placeholder-[#555555] font-mono focus:outline-none focus:border-[#5e6ad2] transition-colors"
                placeholder="ID (auto-generated)"
                value={newTool.id}
                onChange={(e) => setNewTool({ ...newTool, id: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-1.5 text-[12px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                placeholder="Category (e.g. Web, System)"
                value={newTool.category}
                onChange={(e) => setNewTool({ ...newTool, category: e.target.value })}
              />
              <input
                className="bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-1.5 text-[12px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                placeholder="Description"
                value={newTool.description}
                onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
              />
            </div>
            <button
              onClick={handleAddTool}
              disabled={!newTool.name.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Plus className="w-3 h-3" />
              Add to Registry
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
          {allTools.map((tool) => {
            const isSelected = selectedTools.includes(tool.id);
            return (
              <div
                key={tool.id}
                className={clsx(
                  "relative text-left p-3 rounded-md border transition-all group",
                  isSelected
                    ? "border-[#5e6ad2] bg-[#5e6ad2]/8"
                    : "border-[#222222] bg-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#1f1f1f]"
                )}
              >
                <button
                  onClick={() => toggleTool(tool.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[13px] font-medium text-[#f5f5f5] leading-snug">
                      {tool.name}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#5e6ad2] shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-[12px] text-[#888888] leading-snug line-clamp-2">
                    {tool.description}
                  </p>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remove "${tool.name}" from registry?`)) handleDeleteTool(tool.id);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-md text-[#333333] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  title="Remove from registry"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
        {allTools.length === 0 && (
          <p className="text-[12px] text-[#555555]">No tools in registry. Add one above.</p>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center justify-between pt-2 pb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving || !name.trim() || !role.trim()}
          className={clsx(
            "flex items-center justify-center gap-2 px-5 py-2 rounded-md text-[13px] font-medium transition-all",
            "bg-[#5e6ad2] hover:bg-[#6c78e0] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Create Agent Wizard ──────────────────────────────────────────────────────

function CreateAgentWizard({
  agents,
  skills,
  tools,
  onBack,
  onCreated,
}: {
  agents: Agent[];
  skills: Skill[];
  tools: Tool[];
  onBack: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const [identity, setIdentity] = useState({
    name: "",
    agentId: "",
    role: "",
    division: "",
    reportsTo: "",
    agentIdManuallyEdited: false,
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [config, setConfig] = useState({
    model: "claude-sonnet-4-6",
    personality: "",
    cronJobs: [] as CronJob[],
    division: "",
  });

  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    setConfig((c) => ({ ...c, division: identity.division }));
    if (identity.division && !config.personality) {
      setConfig((c) => ({
        ...c,
        personality: defaultPersonality(identity.division),
      }));
    }
  }, [identity.division]);

  const requiredTools = Array.from(
    new Set(
      skills
        .filter((s) => selectedSkills.includes(s.id))
        .flatMap((s) => s.requiredTools || [])
    )
  );

  useEffect(() => {
    setSelectedTools((prev) => {
      const merged = Array.from(new Set([...prev, ...requiredTools]));
      return merged;
    });
  }, [requiredTools.join(",")]);

  const toggleSkill = (id: string) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleTool = (id: string) => {
    if (requiredTools.includes(id)) return;
    setSelectedTools((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const canAdvance = useCallback((): boolean => {
    if (step === 1) return !!(identity.name.trim() && identity.agentId.trim() && identity.role.trim());
    if (step === 2) return true;
    if (step === 3) return true;
    if (step === 4) return !!config.model;
    return true;
  }, [step, identity, config.model]);

  const goNext = () => {
    if (!canAdvance()) return;
    setCompleted((prev) => new Set(Array.from(prev).concat(step)));
    setStep((s) => Math.min(s + 1, 5));
  };

  const goBack = () => {
    if (step === 1) {
      onBack();
      return;
    }
    setStep((s) => Math.max(s - 1, 1));
  };

  const deploy = async () => {
    setDeploying(true);
    setDeployResult(null);
    try {
      const res = await fetch("/api/deploy-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: identity.name,
          agentId: identity.agentId,
          role: identity.role,
          division: identity.division,
          reportsTo: identity.reportsTo,
          model: config.model,
          personality: config.personality,
          skills: selectedSkills,
          tools: selectedTools,
          cronJobs: config.cronJobs,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeployResult({ success: true, message: data.message || "Agent deployed successfully." });
        setTimeout(() => onCreated(), 1500);
      } else {
        setDeployResult({ success: false, message: data.error || "Deployment failed." });
      }
    } catch (e: any) {
      setDeployResult({ success: false, message: e.message || "Network error." });
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] text-[#888888] hover:text-[#f5f5f5] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Create Agent</h1>
          <p className="text-sm text-[#555555] mt-0.5">
            Configure and deploy a new AI agent
          </p>
        </div>
      </div>

      <StepIndicator current={step} completed={completed} onNav={setStep} />

      <div className="bg-[#111111] border border-[#222222] rounded-md p-5 mb-4">
        <h2 className="text-[13px] font-semibold text-[#f5f5f5] mb-4">
          {STEPS[step - 1]}
        </h2>

        {step === 1 && (
          <Step1
            data={identity}
            onChange={(patch) => setIdentity((d) => ({ ...d, ...patch }))}
            agents={agents}
          />
        )}
        {step === 2 && (
          <Step2 skills={skills} selected={selectedSkills} onToggle={toggleSkill} />
        )}
        {step === 3 && (
          <Step3
            tools={tools}
            selected={selectedTools}
            required={requiredTools}
            onToggle={toggleTool}
          />
        )}
        {step === 4 && (
          <Step4
            data={{ ...config }}
            onChange={(patch) => setConfig((c) => ({ ...c, ...patch }))}
          />
        )}
        {step === 5 && (
          <Step5
            identity={identity}
            skills={selectedSkills}
            tools={selectedTools}
            config={config}
            skillList={skills}
            toolList={tools}
            agentList={agents}
            onDeploy={deploy}
            deploying={deploying}
            result={deployResult}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          {step === 1 ? "Cancel" : "Back"}
        </button>

        {step < 5 ? (
          <button
            onClick={goNext}
            disabled={!canAdvance()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [view, setView] = useState<PageView>("list");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Remote data
  const [agents, setAgents] = useState<Agent[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [retiring, setRetiring] = useState(false);

  const loadData = () => {
    fetch("/api/deploy-agent").then((r) => r.json()).then(setAgents).catch(() => {});
    fetch("/api/skills").then((r) => r.json()).then(setSkills).catch(() => {});
    fetch("/api/tools").then((r) => r.json()).then(setTools).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRetire = async () => {
    if (!selectedAgent) return;
    setRetiring(true);
    try {
      await fetch("/api/deploy-agent", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selectedAgent.agent_id }),
      });
      loadData();
      setView("list");
      setSelectedAgent(null);
    } catch (e) {
      console.error("Failed to retire agent:", e);
    } finally {
      setRetiring(false);
    }
  };

  if (view === "create") {
    return (
      <CreateAgentWizard
        agents={agents}
        skills={skills}
        tools={tools}
        onBack={() => setView("list")}
        onCreated={() => {
          loadData();
          setView("list");
        }}
      />
    );
  }

  if (view === "edit" && selectedAgent) {
    return (
      <EditAgentView
        agent={selectedAgent}
        agents={agents}
        skills={skills}
        tools={tools}
        onBack={() => setView("detail")}
        onSaved={() => {
          loadData();
          // Refresh the selected agent data
          fetch("/api/deploy-agent")
            .then((r) => r.json())
            .then((all: Agent[]) => {
              const updated = all.find((a) => a.agent_id === selectedAgent.agent_id);
              if (updated) setSelectedAgent(updated);
              setView("detail");
            })
            .catch(() => setView("list"));
        }}
      />
    );
  }

  if (view === "detail" && selectedAgent) {
    return (
      <AgentDetailView
        agent={selectedAgent}
        agents={agents}
        onBack={() => {
          setView("list");
          setSelectedAgent(null);
        }}
        onEdit={() => {
          setView("edit");
        }}
        onRetire={handleRetire}
        retiring={retiring}
      />
    );
  }

  return (
    <AgentListView
      agents={agents}
      onSelect={(agent) => {
        setSelectedAgent(agent);
        setView("detail");
      }}
      onCreate={() => setView("create")}
    />
  );
}
