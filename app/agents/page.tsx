"use client";

import { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import {
  Check, ChevronRight, ChevronLeft, Search, Plus, X, Loader2, CheckCircle2,
  AlertCircle, Clock, Bot, Shield, Bug, Cpu, ArrowLeft, Pencil, Trash2,
  Users, Crown, Sparkles, Wrench, Activity, Zap, Eye,
} from "lucide-react";
import { MODELS, DIVISIONS, modelRecommendation, defaultPersonality } from "@/lib/agent-models";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Skill { id: string; name: string; category: string; description: string; requiredTools: string[]; }
interface Tool { id: string; name: string; category: string; description: string; }
interface Agent {
  agent_id: string; name: string; role: string; type: string; division: string;
  lead: string; model: string; workspace: string; skills: string[]; tools: string[];
  personality?: string; created: string; status: string;
}
interface Task { id: string; title: string; status: string; priority: string; assignee: string | null; }
interface ActivityItem { id: string; agent_id: string; action: string; detail: string; created_at: string; }

type PageView = "list" | "detail" | "create" | "edit";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function agentColor(a: Agent): string {
  if (a.agent_id === "main") return "#5e6ad2";
  if (a.division?.includes("Security")) return "#ef4444";
  if (a.division?.includes("QA")) return "#f59e0b";
  if (a.division?.includes("Development")) return "#10b981";
  if (a.division?.includes("DevOps")) return "#06b6d4";
  return "#8b5cf6";
}

function AgentIcon({ agent, size = "md" }: { agent: Agent; size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
  if (agent.agent_id === "main") return <Crown className={s} />;
  if (agent.division?.includes("Security")) return <Shield className={s} />;
  if (agent.division?.includes("QA")) return <Bug className={s} />;
  return <Bot className={s} />;
}

function modelShort(m: string) {
  const s = m.replace("anthropic/", "").replace("claude-", "");
  if (s.includes("opus")) return "Opus 4";
  if (s.includes("sonnet")) return "Sonnet 4";
  if (s.includes("haiku")) return "Haiku 4.5";
  return s;
}

function timeAgo(str: string) {
  if (!str) return "";
  const d = new Date(str.replace(" ", "T"));
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

const toKebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

// ─── Agent List View ──────────────────────────────────────────────────────────

function AgentListView({
  agents, tasks, activities, onSelect, onCreate,
}: {
  agents: Agent[]; tasks: Task[]; activities: ActivityItem[];
  onSelect: (a: Agent) => void; onCreate: () => void;
}) {
  const [query, setQuery] = useState("");

  const active = agents.filter((a) => a.status !== "retired");
  const filtered = active.filter((a) =>
    !query || a.name.toLowerCase().includes(query.toLowerCase()) ||
    a.role.toLowerCase().includes(query.toLowerCase()) ||
    a.agent_id.toLowerCase().includes(query.toLowerCase())
  );

  const agentTasks = (id: string) => tasks.filter((t) => t.assignee === id);
  const agentLastAct = (id: string) => activities.find((a) => a.agent_id === id);

  // Stats
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header with stats */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5] tracking-tight">Agents</h1>
          <p className="text-sm text-[#555555] mt-1">{active.length} active agent{active.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white font-medium transition-all shadow-lg shadow-[#5e6ad2]/10">
          <Plus className="w-4 h-4" /> New Agent
        </button>
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Agents", value: active.length, icon: Users, color: "#5e6ad2" },
          { label: "Total Tasks", value: totalTasks, icon: CheckCircle2, color: "#f59e0b" },
          { label: "Completed", value: doneTasks, icon: Zap, color: "#10b981" },
          { label: "Skills Used", value: new Set(active.flatMap((a) => a.skills || [])).size, icon: Sparkles, color: "#8b5cf6" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#111111] border border-[#222222] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-xl font-bold text-[#f5f5f5]">{value}</span>
            </div>
            <p className="text-[11px] text-[#888888]">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555]" />
        <input
          className="w-full bg-[#111111] border border-[#222222] rounded-lg pl-10 pr-4 py-2.5 text-[13px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors"
          placeholder="Search agents..."
          value={query} onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((agent) => {
          const color = agentColor(agent);
          const at = agentTasks(agent.agent_id);
          const activeTasks = at.filter((t) => t.status === "in_progress").length;
          const completedTasks = at.filter((t) => t.status === "done").length;
          const lastAct = agentLastAct(agent.agent_id);

          return (
            <button key={agent.agent_id} onClick={() => onSelect(agent)}
              className="bg-[#111111] border border-[#222222] rounded-xl p-5 text-left hover:border-[#333333] hover:shadow-lg transition-all group relative overflow-hidden">
              {/* Accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: color }} />

              {/* Header */}
              <div className="flex items-start gap-3 mb-4 mt-1">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}15`, color }}>
                  <AgentIcon agent={agent} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-semibold text-[#f5f5f5] truncate">{agent.name}</h3>
                  <p className="text-[11px] text-[#888888] line-clamp-1">{agent.role.split("—")[0].trim()}</p>
                </div>
                <div className={clsx("w-2 h-2 rounded-full mt-1.5 shrink-0", activeTasks > 0 ? "bg-[#5e6ad2] animate-pulse" : "bg-emerald-500")} />
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${color}12`, color }}>{modelShort(agent.model)}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a1a] text-[#666666]">{agent.division === "none" ? "Core" : agent.division}</span>
              </div>

              {/* Task mini-stats */}
              <div className="flex items-center gap-4 mb-3">
                {activeTasks > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#5e6ad2]" />
                    <span className="text-[10px] text-[#5e6ad2] font-medium">{activeTasks} active</span>
                  </div>
                )}
                {completedTasks > 0 && (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] text-emerald-400">{completedTasks} done</span>
                  </div>
                )}
                {at.length === 0 && <span className="text-[10px] text-[#555555]">No tasks assigned</span>}
              </div>

              {/* Skills */}
              {agent.skills?.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-3">
                  {agent.skills.slice(0, 3).map((s) => (
                    <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#1a1a1a] text-[#888888]">{s}</span>
                  ))}
                  {agent.skills.length > 3 && <span className="text-[9px] text-[#555555]">+{agent.skills.length - 3}</span>}
                </div>
              )}

              {/* Last activity */}
              {lastAct && (
                <div className="pt-3 border-t border-[#1a1a1a]">
                  <p className="text-[10px] text-[#555555] truncate">
                    <Activity className="w-3 h-3 inline mr-1" />
                    {lastAct.action.replace(/_/g, " ")} · {timeAgo(lastAct.created_at)}
                  </p>
                </div>
              )}
            </button>
          );
        })}

        {/* New Agent Card */}
        <button onClick={onCreate}
          className="border-2 border-dashed border-[#222222] rounded-xl p-5 flex flex-col items-center justify-center gap-3 hover:border-[#5e6ad2]/50 hover:bg-[#5e6ad2]/5 transition-all min-h-[200px]">
          <div className="w-11 h-11 rounded-xl bg-[#5e6ad2]/10 flex items-center justify-center">
            <Plus className="w-5 h-5 text-[#5e6ad2]" />
          </div>
          <span className="text-[13px] font-medium text-[#555555]">Create New Agent</span>
        </button>
      </div>
    </div>
  );
}

// ─── Agent Detail View ────────────────────────────────────────────────────────

function AgentDetailView({
  agent, agents, tasks, activities, onBack, onEdit, onRetire,
}: {
  agent: Agent; agents: Agent[]; tasks: Task[]; activities: ActivityItem[];
  onBack: () => void; onEdit: () => void; onRetire: () => void;
}) {
  const color = agentColor(agent);
  const reportsTo = agents.find((a) => a.agent_id === agent.lead);
  const subordinates = agents.filter((a) => a.lead === agent.agent_id && a.agent_id !== agent.agent_id && a.status === "active");
  const agentTasks = tasks.filter((t) => t.assignee === agent.agent_id);
  const agentActs = activities.filter((a) => a.agent_id === agent.agent_id).slice(0, 8);
  const isMain = agent.agent_id === "main";

  const [showRetireConfirm, setShowRetireConfirm] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-[#888888] hover:text-[#f5f5f5] transition-colors">
        <ArrowLeft className="w-4 h-4" /> All Agents
      </button>

      {/* Hero Card */}
      <div className="bg-[#111111] border border-[#222222] rounded-xl overflow-hidden">
        <div className="h-2" style={{ backgroundColor: color }} />
        <div className="p-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}15`, color }}>
              <AgentIcon agent={agent} size="lg" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-[#f5f5f5]">{agent.name}</h2>
                <div className={clsx("w-2.5 h-2.5 rounded-full", agent.status === "active" ? "bg-emerald-500" : "bg-red-500")} />
              </div>
              <p className="text-[13px] text-[#888888] leading-relaxed mb-3">{agent.role}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: `${color}12`, color }}>{modelShort(agent.model)}</span>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#1a1a1a] text-[#888888]">{agent.division === "none" ? "Core" : agent.division}</span>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#1a1a1a] text-[#555555] font-mono">{agent.agent_id}</span>
                <span className="text-[11px] text-[#555555]">Created {agent.created}</span>
              </div>
            </div>
            {!isMain && (
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={onEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => setShowRetireConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#888888] hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Retire
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showRetireConfirm && (
        <div className="bg-red-500/8 border border-red-500/25 rounded-lg p-4 flex items-center justify-between">
          <p className="text-[13px] text-red-400">Retire <strong>{agent.name}</strong>?</p>
          <div className="flex gap-2">
            <button onClick={() => setShowRetireConfirm(false)} className="px-3 py-1 rounded-md text-[12px] text-[#888888] hover:bg-[#1a1a1a]">Cancel</button>
            <button onClick={() => { onRetire(); setShowRetireConfirm(false); }} className="px-3 py-1 rounded-md text-[12px] bg-red-500/20 text-red-400 hover:bg-red-500/30">Confirm</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Details */}
        <div className="md:col-span-2 space-y-4">
          {/* Task Summary */}
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-[#555555] mb-3">Tasks ({agentTasks.length})</h3>
            {agentTasks.length === 0 ? (
              <p className="text-[12px] text-[#555555]">No tasks assigned</p>
            ) : (
              <div className="space-y-2">
                {agentTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-[#0a0a0a] rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      {t.status === "done" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> :
                       t.status === "in_progress" ? <Clock className="w-3.5 h-3.5 text-[#5e6ad2]" /> :
                       <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />}
                      <span className={clsx("text-[12px]", t.status === "done" ? "text-[#555555] line-through" : "text-[#f5f5f5]")}>{t.title}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#888888]">{t.status.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skills */}
          {agent.skills?.length > 0 && (
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-[#555555] mb-3">Skills ({agent.skills.length})</h3>
              <div className="flex flex-wrap gap-2">
                {agent.skills.map((s) => (
                  <span key={s} className="text-[11px] px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#222222] text-[#888888]">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tools */}
          {agent.tools?.length > 0 && (
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-[#555555] mb-3">Tools ({agent.tools.length})</h3>
              <div className="flex flex-wrap gap-2">
                {agent.tools.map((t) => (
                  <span key={t} className="text-[11px] px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#222222] text-[#888888] font-mono">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Personality */}
          {agent.personality && (
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-[#555555] mb-3">Personality</h3>
              <p className="text-[12px] text-[#888888] leading-relaxed">{agent.personality}</p>
            </div>
          )}
        </div>

        {/* Right: Hierarchy + Activity */}
        <div className="space-y-4">
          {/* Hierarchy */}
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-[#555555] mb-3">Hierarchy</h3>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-[#555555]">Reports to</span>
                <p className="text-[12px] text-[#f5f5f5] font-medium">{reportsTo ? reportsTo.name : isMain ? "User (Samvel)" : "Main (Gvenik)"}</p>
              </div>
              {subordinates.length > 0 && (
                <div>
                  <span className="text-[10px] text-[#555555]">Manages</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {subordinates.map((s) => (
                      <span key={s.agent_id} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a1a] text-[#888888]">{s.name}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <span className="text-[10px] text-[#555555]">Workspace</span>
                <p className="text-[10px] text-[#888888] font-mono break-all">{agent.workspace}</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-5">
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-[#555555] mb-3">Activity</h3>
            {agentActs.length === 0 ? (
              <p className="text-[11px] text-[#555555]">No activity yet</p>
            ) : (
              <div className="space-y-2">
                {agentActs.map((a) => (
                  <div key={a.id} className="text-[11px]">
                    <span className="text-[#888888]">{a.action.replace(/_/g, " ")}</span>
                    {a.detail && <p className="text-[#555555] truncate">{a.detail}</p>}
                    <p className="text-[9px] text-[#444444]">{timeAgo(a.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Wizard (simplified) ───────────────────────────────────────────────

function CreateWizard({ agents, skills, tools, onBack, onCreated }: {
  agents: Agent[]; skills: Skill[]; tools: Tool[]; onBack: () => void; onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [identity, setIdentity] = useState({ name: "", agentId: "", role: "", division: "", reportsTo: "", idManual: false });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [personality, setPersonality] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const totalSteps = 4;

  const deploy = async () => {
    setDeploying(true);
    try {
      const res = await fetch("/api/deploy-agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: identity.name, agentId: identity.agentId || toKebab(identity.name),
          role: identity.role, division: identity.division, reportsTo: identity.reportsTo,
          model, personality, skills: selectedSkills, tools: selectedTools,
        }),
      });
      const data = await res.json();
      if (data.success) { setResult({ ok: true, msg: data.message }); setTimeout(onCreated, 1500); }
      else setResult({ ok: false, msg: data.error || "Failed" });
    } catch (e: any) { setResult({ ok: false, msg: e.message }); }
    finally { setDeploying(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[#888888] hover:text-[#f5f5f5] transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold text-[#f5f5f5]">Create Agent</h1>
          <p className="text-sm text-[#555555]">Step {step} of {totalSteps}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={clsx("h-1 flex-1 rounded-full transition-colors", i < step ? "bg-[#5e6ad2]" : "bg-[#222222]")} />
        ))}
      </div>

      {result && (
        <div className={clsx("p-3 rounded-lg text-[13px] border flex items-center gap-2",
          result.ok ? "bg-emerald-500/8 border-emerald-500/25 text-emerald-400" : "bg-red-500/8 border-red-500/25 text-red-400")}>
          {result.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {result.msg}
        </div>
      )}

      <div className="bg-[#111111] border border-[#222222] rounded-xl p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-[14px] font-semibold text-[#f5f5f5]">Identity</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Name *</label>
                <input className="w-full bg-[#1a1a1a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2]"
                  placeholder="e.g. Atlas" value={identity.name}
                  onChange={(e) => setIdentity({ ...identity, name: e.target.value, agentId: identity.idManual ? identity.agentId : toKebab(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">ID</label>
                <input className="w-full bg-[#1a1a1a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] font-mono placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2]"
                  placeholder="auto-generated" value={identity.agentId}
                  onChange={(e) => setIdentity({ ...identity, agentId: e.target.value, idManual: true })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Role *</label>
              <textarea className="w-full bg-[#1a1a1a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] resize-none"
                rows={2} placeholder="What does this agent do?" value={identity.role} onChange={(e) => setIdentity({ ...identity, role: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Division</label>
                <select className="w-full bg-[#1a1a1a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]"
                  value={identity.division} onChange={(e) => { setIdentity({ ...identity, division: e.target.value }); if (!personality) setPersonality(defaultPersonality(e.target.value)); }}>
                  <option value="">Select...</option>
                  {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Reports To</label>
                <select className="w-full bg-[#1a1a1a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]"
                  value={identity.reportsTo} onChange={(e) => setIdentity({ ...identity, reportsTo: e.target.value })}>
                  <option value="">Main (Gvenik)</option>
                  {agents.filter((a) => a.status === "active").map((a) => <option key={a.agent_id} value={a.agent_id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-[#f5f5f5]">Skills & Tools</h2>
              <span className="text-[12px] text-[#5e6ad2]">{selectedSkills.length} skills · {selectedTools.length} tools</span>
            </div>
            <p className="text-[12px] text-[#555555]">Select skills (click to toggle)</p>
            <div className="grid grid-cols-3 gap-1.5 max-h-[250px] overflow-y-auto">
              {skills.map((s) => (
                <button key={s.id} onClick={() => setSelectedSkills((p) => p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id])}
                  className={clsx("text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-all border",
                    selectedSkills.includes(s.id) ? "border-[#5e6ad2] bg-[#5e6ad2]/10 text-[#f5f5f5]" : "border-[#222222] text-[#888888] hover:border-[#333333]")}>
                  {s.name}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-[#555555] mt-3">Select tools</p>
            <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto">
              {tools.map((t) => (
                <button key={t.id} onClick={() => setSelectedTools((p) => p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id])}
                  className={clsx("text-left px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all border",
                    selectedTools.includes(t.id) ? "border-[#5e6ad2] bg-[#5e6ad2]/10 text-[#f5f5f5]" : "border-[#222222] text-[#888888] hover:border-[#333333]")}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-[14px] font-semibold text-[#f5f5f5]">Model & Personality</h2>
            <div className="space-y-2">
              {MODELS.map((m) => (
                <button key={m.id} onClick={() => setModel(m.id)}
                  className={clsx("w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3",
                    model === m.id ? "border-[#5e6ad2] bg-[#5e6ad2]/8" : "border-[#222222] hover:border-[#333333]")}>
                  <div className={clsx("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    model === m.id ? "border-[#5e6ad2]" : "border-[#333333]")}>
                    {model === m.id && <div className="w-2 h-2 rounded-full bg-[#5e6ad2]" />}
                  </div>
                  <div className="flex-1">
                    <span className="text-[13px] font-medium text-[#f5f5f5]">{m.name}</span>
                    <p className="text-[11px] text-[#888888]">{m.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Personality</label>
              <textarea className="w-full bg-[#1a1a1a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] resize-none"
                rows={3} placeholder="Working style..." value={personality} onChange={(e) => setPersonality(e.target.value)} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-[14px] font-semibold text-[#f5f5f5]">Review & Deploy</h2>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between py-1.5 border-b border-[#1a1a1a]"><span className="text-[#555555]">Name</span><span className="text-[#f5f5f5]">{identity.name}</span></div>
              <div className="flex justify-between py-1.5 border-b border-[#1a1a1a]"><span className="text-[#555555]">ID</span><span className="text-[#f5f5f5] font-mono">{identity.agentId || toKebab(identity.name)}</span></div>
              <div className="flex justify-between py-1.5 border-b border-[#1a1a1a]"><span className="text-[#555555]">Role</span><span className="text-[#f5f5f5] text-right max-w-[60%]">{identity.role}</span></div>
              <div className="flex justify-between py-1.5 border-b border-[#1a1a1a]"><span className="text-[#555555]">Model</span><span className="text-[#f5f5f5]">{MODELS.find((m) => m.id === model)?.name}</span></div>
              <div className="flex justify-between py-1.5 border-b border-[#1a1a1a]"><span className="text-[#555555]">Skills</span><span className="text-[#f5f5f5]">{selectedSkills.length}</span></div>
              <div className="flex justify-between py-1.5"><span className="text-[#555555]">Tools</span><span className="text-[#f5f5f5]">{selectedTools.length}</span></div>
            </div>
            <button onClick={deploy} disabled={deploying || result?.ok}
              className={clsx("w-full py-2.5 rounded-lg text-[13px] font-medium flex items-center justify-center gap-2 transition-all",
                result?.ok ? "bg-emerald-500/20 text-emerald-400" : "bg-[#5e6ad2] hover:bg-[#6c78e0] text-white disabled:opacity-50")}>
              {deploying ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</> :
               result?.ok ? <><CheckCircle2 className="w-4 h-4" /> Deployed</> : "Deploy Agent"}
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex justify-between">
        <button onClick={() => step === 1 ? onBack() : setStep(step - 1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] text-[#888888] hover:text-[#f5f5f5] transition-all">
          <ChevronLeft className="w-4 h-4" /> {step === 1 ? "Cancel" : "Back"}
        </button>
        {step < totalSteps ? (
          <button onClick={() => setStep(step + 1)} disabled={step === 1 && (!identity.name || !identity.role)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white font-medium disabled:opacity-40 transition-all">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : <span />}
      </div>
    </div>
  );
}

// ─── Edit View (simplified) ───────────────────────────────────────────────────

function EditView({ agent, agents, skills, tools, onBack, onSaved }: {
  agent: Agent; agents: Agent[]; skills: Skill[]; tools: Tool[]; onBack: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [division, setDivision] = useState(agent.division || "");
  const [reportsTo, setReportsTo] = useState(agent.lead || "");
  const [model, setModel] = useState(agent.model?.replace("anthropic/", "") || "claude-sonnet-4-6");
  const [personality, setPersonality] = useState(agent.personality || "");
  const [selSkills, setSelSkills] = useState<string[]>(agent.skills || []);
  const [selTools, setSelTools] = useState<string[]>(agent.tools || []);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch("/api/deploy-agent", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agent.agent_id, name, role, division, reportsTo, model, personality, skills: selSkills, tools: selTools }),
    });
    setSaving(false); onSaved();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[#888888] hover:text-[#f5f5f5]"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold text-[#f5f5f5]">Edit {agent.name}</h1>
      </div>

      <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Name</label>
            <input className="w-full bg-[#1a1a1a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">ID</label>
            <input className="w-full bg-[#1a1a1a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#555555] font-mono" value={agent.agent_id} disabled /></div>
        </div>
        <div className="space-y-1.5"><label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Role</label>
          <textarea className="w-full bg-[#1a1a1a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] resize-none focus:outline-none focus:border-[#5e6ad2]" rows={2} value={role} onChange={(e) => setRole(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Division</label>
            <select className="w-full bg-[#1a1a1a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]" value={division} onChange={(e) => setDivision(e.target.value)}>
              <option value="">Select...</option>{DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
          <div className="space-y-1.5"><label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Reports To</label>
            <select className="w-full bg-[#1a1a1a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]" value={reportsTo} onChange={(e) => setReportsTo(e.target.value)}>
              <option value="">Main (Gvenik)</option>{agents.filter((a) => a.agent_id !== agent.agent_id && a.status === "active").map((a) => <option key={a.agent_id} value={a.agent_id}>{a.name}</option>)}</select></div>
        </div>
        <div className="space-y-1.5"><label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Personality</label>
          <textarea className="w-full bg-[#1a1a1a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] resize-none focus:outline-none focus:border-[#5e6ad2]" rows={3} value={personality} onChange={(e) => setPersonality(e.target.value)} /></div>
      </div>

      {/* Model */}
      <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-3">
        <h2 className="text-[14px] font-semibold text-[#f5f5f5]">Model</h2>
        <div className="space-y-2">
          {MODELS.map((m) => (
            <button key={m.id} onClick={() => setModel(m.id)}
              className={clsx("w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3",
                model === m.id ? "border-[#5e6ad2] bg-[#5e6ad2]/8" : "border-[#222222] hover:border-[#333333]")}>
              <div className={clsx("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                model === m.id ? "border-[#5e6ad2]" : "border-[#333333]")}>
                {model === m.id && <div className="w-2 h-2 rounded-full bg-[#5e6ad2]" />}
              </div>
              <div className="flex-1">
                <span className="text-[13px] font-medium text-[#f5f5f5]">{m.name}</span>
                <p className="text-[11px] text-[#888888]">{m.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[#f5f5f5]">Skills</h2>
          <span className="text-[12px] text-[#5e6ad2] font-medium">{selSkills.length} selected</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 max-h-[280px] overflow-y-auto pr-1">
          {skills.map((s) => {
            const isSelected = selSkills.includes(s.id);
            return (
              <button key={s.id} onClick={() => setSelSkills((p) => isSelected ? p.filter((x) => x !== s.id) : [...p, s.id])}
                className={clsx("text-left px-2.5 py-2 rounded-lg text-[11px] transition-all border",
                  isSelected ? "border-[#5e6ad2] bg-[#5e6ad2]/10 text-[#f5f5f5]" : "border-[#222222] text-[#888888] hover:border-[#333333]")}>
                <div className="flex items-center gap-1.5">
                  {isSelected && <Check className="w-3 h-3 text-[#5e6ad2] shrink-0" />}
                  <span className="truncate">{s.name}</span>
                </div>
                <p className="text-[9px] text-[#555555] mt-0.5 truncate">{s.category}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tools */}
      <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[#f5f5f5]">Tools</h2>
          <span className="text-[12px] text-[#5e6ad2] font-medium">{selTools.length} selected</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
          {tools.map((t) => {
            const isSelected = selTools.includes(t.id);
            return (
              <button key={t.id} onClick={() => setSelTools((p) => isSelected ? p.filter((x) => x !== t.id) : [...p, t.id])}
                className={clsx("text-left px-2.5 py-2 rounded-lg text-[11px] font-mono transition-all border",
                  isSelected ? "border-[#5e6ad2] bg-[#5e6ad2]/10 text-[#f5f5f5]" : "border-[#222222] text-[#888888] hover:border-[#333333]")}>
                <div className="flex items-center gap-1.5">
                  {isSelected && <Check className="w-3 h-3 text-[#5e6ad2] shrink-0" />}
                  <span className="truncate">{t.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between pb-6">
        <button onClick={onBack} className="px-3 py-1.5 text-[13px] text-[#888888] hover:text-[#f5f5f5]">Cancel</button>
        <button onClick={save} disabled={saving || !name || !role}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-[13px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white font-medium disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Changes
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [view, setView] = useState<PageView>("list");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const loadData = useCallback(async () => {
    const [a, s, t, tk, act] = await Promise.all([
      fetch("/api/deploy-agent").then((r) => r.json()).catch(() => []),
      fetch("/api/skills").then((r) => r.json()).catch(() => []),
      fetch("/api/tools").then((r) => r.json()).catch(() => []),
      fetch("/api/tasks").then((r) => r.json()).catch(() => []),
      fetch("/api/activities?limit=30").then((r) => r.json()).catch(() => []),
    ]);
    setAgents(a); setSkills(s); setTools(t); setTasks(tk); setActivities(act);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRetire = async () => {
    if (!selectedAgent) return;
    await fetch("/api/deploy-agent", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentId: selectedAgent.agent_id }) });
    loadData(); setView("list"); setSelectedAgent(null);
  };

  if (view === "create") return <CreateWizard agents={agents} skills={skills} tools={tools} onBack={() => setView("list")} onCreated={() => { loadData(); setView("list"); }} />;

  if (view === "edit" && selectedAgent) return <EditView agent={selectedAgent} agents={agents} skills={skills} tools={tools} onBack={() => setView("detail")}
    onSaved={() => { loadData(); fetch("/api/deploy-agent").then((r) => r.json()).then((all: Agent[]) => { const u = all.find((a) => a.agent_id === selectedAgent.agent_id); if (u) setSelectedAgent(u); setView("detail"); }); }} />;

  if (view === "detail" && selectedAgent) return <AgentDetailView agent={selectedAgent} agents={agents} tasks={tasks} activities={activities}
    onBack={() => { setView("list"); setSelectedAgent(null); }} onEdit={() => setView("edit")} onRetire={handleRetire} />;

  return <AgentListView agents={agents} tasks={tasks} activities={activities}
    onSelect={(a) => { setSelectedAgent(a); setView("detail"); }} onCreate={() => setView("create")} />;
}
