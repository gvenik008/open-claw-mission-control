"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  UserPlus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";

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
}

function modelLabel(model: string) {
  const m = model.replace("anthropic/", "");
  if (m.includes("opus")) return "Opus 4";
  if (m.includes("sonnet")) return "Sonnet 4";
  if (m.includes("haiku")) return "Haiku 4.5";
  return m;
}

function AgentCard({
  agent,
  isMain,
  onRetire,
}: {
  agent: Agent;
  isMain: boolean;
  onRetire: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [retiring, setRetiring] = useState(false);

  const isRetired = agent.status === "retired";

  const handleRetire = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setRetiring(true);
    try {
      await fetch("/api/deploy-agent", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.agent_id }),
      });
      onRetire(agent.agent_id);
    } catch {
      // ignore
    } finally {
      setRetiring(false);
      setConfirming(false);
    }
  };

  return (
    <div
      className={clsx(
        "bg-[#111111] border rounded-md transition-all",
        isRetired ? "border-[#1e1e1e] opacity-50" : "border-[#222222]"
      )}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors rounded-md"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Status dot */}
        <div
          className={clsx(
            "w-2 h-2 rounded-full shrink-0",
            isRetired
              ? "bg-[#555555]"
              : agent.status === "active"
              ? "bg-emerald-500"
              : "bg-amber-500"
          )}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-[#f5f5f5]">{agent.name}</span>
            {isMain && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-[#5e6ad2]/20 text-[#5e6ad2]">
                orchestrator
              </span>
            )}
            {agent.division && agent.division !== "none" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888]">
                {agent.division}
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#555555] leading-snug truncate mt-0.5">{agent.role}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {agent.skills?.length > 0 && (
            <span className="text-[10px] text-[#555555]">
              {agent.skills.length} skill{agent.skills.length !== 1 ? "s" : ""}
            </span>
          )}
          {agent.tools?.length > 0 && (
            <span className="text-[10px] text-[#555555]">
              {agent.tools.length} tool{agent.tools.length !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888] font-mono">
            {modelLabel(agent.model)}
          </span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#555555]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#555555]" />
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-[#222222] px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <Detail label="Agent ID" value={<span className="font-mono">{agent.agent_id}</span>} />
            <Detail label="Status" value={agent.status} />
            <Detail label="Model" value={agent.model.replace("anthropic/", "")} />
            <Detail label="Reports To" value={agent.lead || "—"} />
            {agent.workspace && (
              <Detail
                label="Workspace"
                value={<span className="font-mono text-[11px]">{agent.workspace}</span>}
                full
              />
            )}
            {agent.created && <Detail label="Created" value={agent.created} />}
          </div>

          {agent.skills?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium mb-1.5">
                Skills
              </p>
              <div className="flex flex-wrap gap-1">
                {agent.skills.map((s) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {agent.tools?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium mb-1.5">
                Tools
              </p>
              <div className="flex flex-wrap gap-1">
                {agent.tools.map((t) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!isMain && !isRetired && (
            <div className="flex items-center justify-end pt-1">
              {confirming ? (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[#888888]">Retire this agent?</span>
                  <button
                    onClick={() => setConfirming(false)}
                    className="px-2.5 py-1 rounded-md text-[12px] text-[#888888] hover:text-[#f5f5f5] hover:bg-[#222222] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRetire}
                    disabled={retiring}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                  >
                    {retiring ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Confirm
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRetire}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] text-[#555555] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Retire
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  full,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={clsx(full && "col-span-2")}>
      <p className="text-[10px] text-[#555555] mb-0.5">{label}</p>
      <p className="text-[12px] text-[#f5f5f5]">{value}</p>
    </div>
  );
}

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleRetire = (agentId: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.agent_id === agentId ? { ...a, status: "retired" } : a))
    );
  };

  const mainAgent = agents.find(
    (a) => a.agent_id === "main" || a.agent_id === "gvenik"
  );
  const otherAgents = agents.filter(
    (a) => a.agent_id !== "main" && a.agent_id !== "gvenik"
  );
  const isOnlyMain = agents.length <= 1;

  // Group non-main agents by division
  const grouped = otherAgents.reduce<Record<string, Agent[]>>((acc, a) => {
    const div = a.division && a.division !== "none" ? a.division : "Independent";
    (acc[div] = acc[div] || []).push(a);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Team</h1>
          <p className="text-sm text-[#555555] mt-0.5">
            {loading ? "Loading…" : `${agents.length} agent${agents.length !== 1 ? "s" : ""}`}
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
        <div className="flex items-center gap-2 text-[13px] text-[#555555] py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading agents…
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-[13px] text-red-400 bg-red-500/8 border border-red-500/20 rounded-md px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Orchestrator */}
          {mainAgent ? (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium mb-2">
                Orchestrator
              </p>
              <AgentCard agent={mainAgent} isMain onRetire={handleRetire} />
            </div>
          ) : (
            /* Fallback static Gvenik card when registry has no main entry */
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium mb-2">
                Orchestrator
              </p>
              <div className="bg-[#111111] border border-[#222222] rounded-md px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[#f5f5f5]">Gvenik</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-[#5e6ad2]/20 text-[#5e6ad2]">
                      orchestrator
                    </span>
                  </div>
                  <p className="text-[12px] text-[#555555] mt-0.5">Main AI assistant</p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888] font-mono">
                  Opus 4
                </span>
              </div>
            </div>
          )}

          {/* CTA if only main agent */}
          {isOnlyMain && (
            <div className="bg-[#111111] border border-[#222222] rounded-md px-5 py-8 flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#222222] flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-[#5e6ad2]" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#f5f5f5]">Your team is just getting started</p>
                <p className="text-[13px] text-[#555555] mt-0.5">
                  Create your first specialized agent to start building your AI workforce.
                </p>
              </div>
              <Link
                href="/agents"
                className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium mt-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Create First Agent
              </Link>
            </div>
          )}

          {/* Grouped by division */}
          {!isOnlyMain &&
            Object.entries(grouped).map(([division, divAgents]) => (
              <div key={division}>
                <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium mb-2">
                  {division} — {divAgents.length}
                </p>
                <div className="space-y-2">
                  {divAgents.map((agent) => (
                    <AgentCard
                      key={agent.agent_id}
                      agent={agent}
                      isMain={false}
                      onRetire={handleRetire}
                    />
                  ))}
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
