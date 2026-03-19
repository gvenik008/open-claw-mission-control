"use client";

import { useState } from "react";
import { Sparkles, Eye, Palette, Shield, Zap } from "lucide-react";
import clsx from "clsx";

type AgentStatus = "Active" | "Idle" | "Offline";

interface CouncilAgent {
  id: string;
  name: string;
  role: string;
  icon: typeof Sparkles;
  status: AgentStatus;
  lastAction: string;
  color: string;
  vote?: "For" | "Against" | "Abstain";
}

const STATUS_DOTS: Record<AgentStatus, string> = {
  Active: "bg-emerald-500 shadow-emerald-500/50",
  Idle: "bg-yellow-500 shadow-yellow-500/50",
  Offline: "bg-red-500 shadow-red-500/50",
};

const AGENTS: CouncilAgent[] = [
  { id: "a1", name: "Strategist", role: "Long-term planning & decision architecture", icon: Sparkles, status: "Active", lastAction: "Evaluated project timeline", color: "from-purple-500/20 to-purple-900/10 border-purple-500/30" },
  { id: "a2", name: "Analyst", role: "Data analysis & pattern recognition", icon: Eye, status: "Active", lastAction: "Processed daily metrics", color: "from-cyan-500/20 to-cyan-900/10 border-cyan-500/30" },
  { id: "a3", name: "Creative", role: "Content generation & ideation", icon: Palette, status: "Idle", lastAction: "Drafted social media campaign", color: "from-orange-500/20 to-orange-900/10 border-orange-500/30" },
  { id: "a4", name: "Guardian", role: "Security monitoring & risk assessment", icon: Shield, status: "Active", lastAction: "Scanned for vulnerabilities", color: "from-red-500/20 to-red-900/10 border-red-500/30" },
  { id: "a5", name: "Executor", role: "Task execution & automation", icon: Zap, status: "Idle", lastAction: "Completed deployment pipeline", color: "from-green-500/20 to-green-900/10 border-green-500/30" },
];

export default function CouncilPage() {
  const [agents, setAgents] = useState(AGENTS);
  const [deliberating, setDeliberating] = useState(false);
  const [topic, setTopic] = useState("Should we deploy the new skill to production?");
  const [phase, setPhase] = useState(0);

  function conveneCouncil() {
    setDeliberating(true);
    setPhase(0);
    setAgents((prev) => prev.map((a) => ({ ...a, vote: undefined })));

    const votes: ("For" | "Against" | "Abstain")[] = ["For", "For", "Against", "For", "Abstain"];
    let step = 0;
    const interval = setInterval(() => {
      if (step < AGENTS.length) {
        setAgents((prev) =>
          prev.map((a, i) => (i === step ? { ...a, vote: votes[i] } : a))
        );
        step++;
        setPhase(step);
      } else {
        clearInterval(interval);
      }
    }, 800);
  }

  const voteColor = (v?: string) => {
    if (v === "For") return "text-emerald-400";
    if (v === "Against") return "text-red-400";
    if (v === "Abstain") return "text-yellow-400";
    return "text-[#555555]";
  };

  return (
    <div className="space-y-6">
      {/* Header with mystical styling */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight flex items-center gap-2">
            <span className="text-purple-400">⚔</span> Agent Council
          </h1>
          <p className="text-sm text-[#555555] mt-0.5">The council deliberates on critical decisions</p>
        </div>
        <button
          onClick={conveneCouncil}
          className="flex items-center gap-1.5 bg-purple-600/80 hover:bg-purple-600 text-white text-xs rounded-md px-4 py-2 transition-all shadow-lg shadow-purple-500/20"
        >
          <Sparkles className="w-3.5 h-3.5" /> Convene Council
        </button>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <div key={agent.id} className={clsx("bg-gradient-to-br rounded-md p-4 border transition-all duration-500", agent.color, deliberating && agent.vote && "ring-1 ring-purple-500/30")}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-[#0a0a0a]/60 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#f5f5f5]" />
                  </div>
                  <div>
                    <h3 className="text-[13px] text-[#f5f5f5] font-medium">{agent.name}</h3>
                    <p className="text-[10px] text-[#888888]">{agent.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={clsx("w-2 h-2 rounded-full shadow-sm", STATUS_DOTS[agent.status])} />
                  <span className="text-[10px] text-[#555555]">{agent.status}</span>
                </div>
              </div>
              <p className="text-[11px] text-[#555555] mb-2">Last: {agent.lastAction}</p>
              {deliberating && (
                <div className="pt-2 border-t border-[#333333]/50">
                  {agent.vote ? (
                    <span className={clsx("text-xs font-medium", voteColor(agent.vote))}>
                      Vote: {agent.vote} {agent.vote === "For" ? "✓" : agent.vote === "Against" ? "✗" : "—"}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#555555] animate-pulse">Deliberating...</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Deliberation Panel */}
      {deliberating && (
        <div className="bg-[#111111] border border-purple-500/20 rounded-md p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-[#f5f5f5]">Council Deliberation</h2>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Topic</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-purple-500" />
          </div>
          <div className="flex items-center gap-4 pt-2">
            <span className="text-[11px] text-[#555555]">Results:</span>
            <span className="text-xs text-emerald-400">For: {agents.filter((a) => a.vote === "For").length}</span>
            <span className="text-xs text-red-400">Against: {agents.filter((a) => a.vote === "Against").length}</span>
            <span className="text-xs text-yellow-400">Abstain: {agents.filter((a) => a.vote === "Abstain").length}</span>
          </div>
          {phase >= AGENTS.length && (
            <div className="pt-2 border-t border-[#222222]">
              <p className="text-[13px] text-emerald-400 font-medium">✓ Council decision: Approved (3-1-1)</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
