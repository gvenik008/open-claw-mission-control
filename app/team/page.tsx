"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  UserPlus,
  Loader2,
  AlertCircle,
  Cpu,
  Bot,
  Shield,
  Bug,
  Wrench,
  ChevronRight,
  Users,
  Crown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  agent_id: string;
  name: string;
  role: string;
  model: string;
  division: string;
  lead: string;
  skills: string[];
  tools: string[];
  workspace: string;
  created: string;
  status: string;
  type?: string;
  personality?: string;
}

interface TreeNode {
  agent: Agent;
  children: TreeNode[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function modelLabel(model: string) {
  const m = model.replace("anthropic/", "");
  if (m.includes("opus")) return "Opus 4";
  if (m.includes("sonnet")) return "Sonnet 4";
  if (m.includes("haiku")) return "Haiku 4.5";
  return m;
}

function agentIcon(agent: Agent) {
  if (agent.agent_id === "main") return <Crown className="w-5 h-5" />;
  if (agent.type === "orchestrator") return <Cpu className="w-5 h-5" />;
  if (agent.division?.includes("Security")) return <Shield className="w-5 h-5" />;
  if (agent.division?.includes("QA")) return <Bug className="w-5 h-5" />;
  return <Bot className="w-5 h-5" />;
}

function agentColor(agent: Agent): string {
  if (agent.agent_id === "main") return "#5e6ad2";
  if (agent.division?.includes("Security")) return "#ef4444";
  if (agent.division?.includes("QA")) return "#f59e0b";
  if (agent.division?.includes("Development")) return "#10b981";
  if (agent.division?.includes("DevOps")) return "#06b6d4";
  if (agent.division?.includes("Research")) return "#8b5cf6";
  if (agent.division?.includes("Design")) return "#ec4899";
  return "#888888";
}

function buildTree(agents: Agent[]): TreeNode | null {
  const active = agents.filter((a) => a.status !== "retired");
  const main = active.find((a) => a.agent_id === "main" || a.type === "orchestrator");
  if (!main) return null;

  const byLead = new Map<string, Agent[]>();
  active.forEach((a) => {
    if (a.agent_id === main.agent_id) return;
    const lead = a.lead || "main";
    const list = byLead.get(lead) || [];
    list.push(a);
    byLead.set(lead, list);
  });

  function build(agent: Agent): TreeNode {
    const children = (byLead.get(agent.agent_id) || []).map(build);
    return { agent, children };
  }

  return build(main);
}

// ─── Org Chart Card ───────────────────────────────────────────────────────────

function OrgCard({
  agent,
  isRoot,
  onClick,
}: {
  agent: Agent;
  isRoot?: boolean;
  onClick: () => void;
}) {
  const color = agentColor(agent);
  const isMain = agent.agent_id === "main";

  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative flex flex-col items-center text-center group transition-all",
        "hover:scale-105 hover:z-10"
      )}
    >
      <div
        className={clsx(
          "rounded-xl border-2 p-4 transition-all bg-[#111111]",
          isRoot ? "w-48" : "w-44"
        )}
        style={{ borderColor: `${color}40` }}
      >
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {agentIcon(agent)}
        </div>

        {/* Name */}
        <h3
          className={clsx(
            "font-semibold text-[#f5f5f5] leading-tight mb-1",
            isRoot ? "text-[15px]" : "text-[13px]"
          )}
        >
          {agent.name}
        </h3>

        {/* Role (truncated) */}
        <p className="text-[11px] text-[#888888] leading-snug line-clamp-2 mb-2">
          {agent.role.split("—")[0].trim()}
        </p>

        {/* Model badge */}
        <div className="flex items-center justify-center gap-1.5">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {modelLabel(agent.model)}
          </span>
          {agent.status === "active" && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
        </div>

        {/* Stats row */}
        {(agent.skills?.length > 0 || agent.tools?.length > 0) && (
          <div className="flex items-center justify-center gap-2 mt-2">
            {agent.skills?.length > 0 && (
              <span className="text-[9px] text-[#555555]">
                {agent.skills.length} skill{agent.skills.length !== 1 ? "s" : ""}
              </span>
            )}
            {agent.tools?.length > 0 && (
              <span className="text-[9px] text-[#555555]">
                {agent.tools.length} tool{agent.tools.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Tree Level Renderer ──────────────────────────────────────────────────────

function TreeLevel({
  node,
  onSelect,
  depth,
}: {
  node: TreeNode;
  onSelect: (agent: Agent) => void;
  depth: number;
}) {
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* This node's card */}
      <OrgCard
        agent={node.agent}
        isRoot={depth === 0}
        onClick={() => onSelect(node.agent)}
      />

      {/* Connector line down */}
      {hasChildren && (
        <div className="w-px h-6 bg-[#333333]" />
      )}

      {/* Horizontal connector bar */}
      {hasChildren && node.children.length > 1 && (
        <div className="relative w-full flex justify-center">
          <div
            className="h-px bg-[#333333] absolute top-0"
            style={{
              left: `calc(100% / ${node.children.length} / 2)`,
              width: node.children.length > 1
                ? `calc(100% - 100% / ${node.children.length})`
                : "0px",
            }}
          />
        </div>
      )}

      {/* Children */}
      {hasChildren && (
        <div className="flex items-start gap-2 pt-0">
          {node.children.map((child, idx) => (
            <div key={child.agent.agent_id} className="flex flex-col items-center">
              {/* Vertical connector from horizontal bar to child */}
              <div className="w-px h-6 bg-[#333333]" />
              <TreeLevel node={child} onSelect={onSelect} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Agent Detail Sidebar ─────────────────────────────────────────────────────

function AgentSidebar({
  agent,
  agents,
  onClose,
}: {
  agent: Agent;
  agents: Agent[];
  onClose: () => void;
}) {
  const color = agentColor(agent);
  const reportsTo = agents.find((a) => a.agent_id === agent.lead);
  const subordinates = agents.filter(
    (a) => a.lead === agent.agent_id && a.agent_id !== agent.agent_id && a.status === "active"
  );

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-[#111111] border-l border-[#222222] z-50 overflow-y-auto shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-[#111111] border-b border-[#222222] px-5 py-4 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#f5f5f5]">Agent Details</span>
        <button
          onClick={onClose}
          className="text-[#555555] hover:text-[#f5f5f5] transition-colors text-[13px]"
        >
          ✕
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-full mb-3 flex items-center justify-center"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {agentIcon(agent)}
          </div>
          <h3 className="text-[16px] font-semibold text-[#f5f5f5]">{agent.name}</h3>
          <p className="text-[12px] text-[#888888] mt-1 leading-relaxed">{agent.role}</p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${color}15`, color }}
            >
              {modelLabel(agent.model)}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
              {agent.status}
            </span>
          </div>
        </div>

        {/* Info grid */}
        <div className="space-y-3">
          <DetailRow label="Agent ID" value={agent.agent_id} mono />
          <DetailRow label="Division" value={agent.division === "none" ? "Core" : agent.division} />
          <DetailRow
            label="Reports to"
            value={reportsTo ? reportsTo.name : agent.agent_id === "main" ? "User (Samvel)" : "—"}
          />
          {subordinates.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium mb-1.5">
                Manages
              </p>
              <div className="flex flex-wrap gap-1">
                {subordinates.map((s) => (
                  <span
                    key={s.agent_id}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a1a] text-[#888888] border border-[#222222]"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <DetailRow label="Created" value={agent.created} />
          <DetailRow label="Workspace" value={agent.workspace} mono small />
        </div>

        {/* Skills */}
        {agent.skills?.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium mb-2">
              Skills ({agent.skills.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {agent.skills.map((s) => (
                <span
                  key={s}
                  className="text-[10px] px-2 py-1 rounded-md bg-[#1a1a1a] border border-[#222222] text-[#888888]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tools */}
        {agent.tools?.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium mb-2">
              Tools ({agent.tools.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {agent.tools.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-2 py-1 rounded-md bg-[#1a1a1a] border border-[#222222] text-[#888888] font-mono"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Personality */}
        {agent.personality && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium mb-2">
              Personality
            </p>
            <p className="text-[11px] text-[#888888] leading-relaxed bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-3">
              {agent.personality}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2">
          <Link
            href="/agents"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-md text-[13px] bg-[#1a1a1a] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] transition-all"
          >
            Edit in Agents
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] text-[#555555] shrink-0">{label}</span>
      <span
        className={clsx(
          "text-[11px] text-[#f5f5f5] text-right",
          mono && "font-mono",
          small && "text-[10px] text-[#888888]"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─── User node (Samvel at top) ────────────────────────────────────────────────

function UserNode() {
  return (
    <div className="flex flex-col items-center mb-0">
      <div className="rounded-xl border-2 border-[#5e6ad2]/30 bg-[#111111] p-4 w-40 text-center">
        <div className="w-10 h-10 rounded-full mx-auto mb-2 bg-[#5e6ad2]/20 flex items-center justify-center text-[#5e6ad2] text-lg font-semibold">
          S
        </div>
        <h3 className="text-[13px] font-semibold text-[#f5f5f5]">Samvel</h3>
        <p className="text-[10px] text-[#888888] mt-0.5">Human Lead</p>
      </div>
      <div className="w-px h-6 bg-[#333333]" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    fetch("/api/deploy-agent")
      .then((r) => r.json())
      .then((data) => {
        setAgents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load agents.");
        setLoading(false);
      });
  }, []);

  const tree = useMemo(() => buildTree(agents), [agents]);
  const activeCount = agents.filter((a) => a.status !== "retired").length;

  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between max-w-3xl mx-auto">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Team</h1>
          <p className="text-sm text-[#555555] mt-0.5">
            {loading
              ? "Loading…"
              : `${activeCount} active agent${activeCount !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/agents"
          className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Create Agent
        </Link>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-[13px] text-[#555555] py-12">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading team…
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-[13px] text-red-400 bg-red-500/8 border border-red-500/20 rounded-md px-4 py-3 max-w-3xl mx-auto">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Org Chart */}
      {!loading && !error && tree && (
        <div className="flex justify-center overflow-x-auto pb-8 pt-4">
          <div className="flex flex-col items-center min-w-max">
            <UserNode />
            <TreeLevel node={tree} onSelect={setSelectedAgent} depth={0} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !tree && (
        <div className="bg-[#111111] border border-[#222222] rounded-md px-5 py-12 flex flex-col items-center text-center gap-3 max-w-3xl mx-auto">
          <Users className="w-10 h-10 text-[#333333]" />
          <div>
            <p className="text-[14px] font-medium text-[#f5f5f5]">No agents found</p>
            <p className="text-[13px] text-[#555555] mt-0.5">
              Create your first agent to build your team.
            </p>
          </div>
          <Link
            href="/agents"
            className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium mt-2"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create Agent
          </Link>
        </div>
      )}

      {/* Detail sidebar */}
      {selectedAgent && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSelectedAgent(null)}
          />
          <AgentSidebar
            agent={selectedAgent}
            agents={agents}
            onClose={() => setSelectedAgent(null)}
          />
        </>
      )}
    </div>
  );
}
