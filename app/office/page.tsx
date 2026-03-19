"use client";

import { useState, useEffect, useMemo } from "react";
import clsx from "clsx";

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
  status: string;
  personality?: string;
}

interface DeskPosition {
  row: number;
  col: number;
}

// ─── Robot Colors & Status ────────────────────────────────────────────────────

const ROBOT_COLORS: Record<string, { body: string; glow: string; eye: string }> = {
  main:         { body: "#5e6ad2", glow: "#5e6ad230", eye: "#a5b4fc" },
  "qa-lead":    { body: "#f59e0b", glow: "#f59e0b30", eye: "#fde68a" },
  "qa-functional": { body: "#10b981", glow: "#10b98130", eye: "#6ee7b7" },
  "qa-security":   { body: "#ef4444", glow: "#ef444430", eye: "#fca5a5" },
  "qa-general":    { body: "#06b6d4", glow: "#06b6d430", eye: "#67e8f9" },
};

const DEFAULT_COLOR = { body: "#8b5cf6", glow: "#8b5cf630", eye: "#c4b5fd" };

const IDLE_ACTIVITIES = [
  "Idle — ready for tasks",
  "Standing by…",
  "Waiting for instructions",
  "On standby",
];

const ACTIVE_ACTIVITIES: Record<string, string[]> = {
  main: ["Orchestrating workflows", "Reviewing agent outputs", "Planning next sprint", "Checking system status"],
  "qa-lead": ["Planning test strategy", "Reviewing QA reports", "Assigning test tasks", "Compiling findings"],
  "qa-functional": ["Testing user flows", "Checking edge cases", "Validating forms", "Running regression tests"],
  "qa-security": ["Scanning for vulnerabilities", "Testing auth bypass", "Checking XSS vectors", "Auditing headers"],
  "qa-general": ["Running smoke tests", "Exploratory testing", "Verifying deployments", "Quick sanity check"],
};

function getActivity(agentId: string): string {
  const activities = ACTIVE_ACTIVITIES[agentId];
  if (activities) {
    return activities[Math.floor(Math.random() * activities.length)];
  }
  return IDLE_ACTIVITIES[Math.floor(Math.random() * IDLE_ACTIVITIES.length)];
}

// ─── SVG Robot Component ──────────────────────────────────────────────────────

function Robot({ color, size = 60, blinking = false }: { color: { body: string; glow: string; eye: string }; size?: number; blinking?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Glow */}
      <circle cx="30" cy="35" r="25" fill={color.glow} />
      {/* Antenna */}
      <line x1="30" y1="10" x2="30" y2="4" stroke={color.body} strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="3" r="2.5" fill={color.body}>
        <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Head */}
      <rect x="16" y="10" width="28" height="22" rx="6" fill={color.body} />
      {/* Visor */}
      <rect x="20" y="15" width="20" height="10" rx="3" fill="#0a0a0a" opacity="0.7" />
      {/* Eyes */}
      <circle cx="25" cy="20" r={blinking ? 0.5 : 2.5} fill={color.eye}>
        <animate attributeName="r" values="2.5;2.5;0.5;2.5;2.5" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="35" cy="20" r={blinking ? 0.5 : 2.5} fill={color.eye}>
        <animate attributeName="r" values="2.5;2.5;0.5;2.5;2.5" dur="4s" repeatCount="indefinite" />
      </circle>
      {/* Body */}
      <rect x="19" y="33" width="22" height="16" rx="4" fill={color.body} opacity="0.85" />
      {/* Chest light */}
      <circle cx="30" cy="40" r="2" fill={color.eye} opacity="0.6">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* Arms */}
      <rect x="11" y="35" width="7" height="3" rx="1.5" fill={color.body} opacity="0.7" />
      <rect x="42" y="35" width="7" height="3" rx="1.5" fill={color.body} opacity="0.7" />
      {/* Legs */}
      <rect x="23" y="49" width="5" height="6" rx="2" fill={color.body} opacity="0.7" />
      <rect x="32" y="49" width="5" height="6" rx="2" fill={color.body} opacity="0.7" />
    </svg>
  );
}

// ─── Desk with Monitor SVG ────────────────────────────────────────────────────

function Desk({ color, active }: { color: { body: string; glow: string; eye: string }; active: boolean }) {
  return (
    <svg width="120" height="70" viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Desk surface */}
      <rect x="5" y="40" width="110" height="8" rx="2" fill="#1a1a1a" />
      {/* Desk legs */}
      <rect x="12" y="48" width="4" height="20" rx="1" fill="#161616" />
      <rect x="104" y="48" width="4" height="20" rx="1" fill="#161616" />
      {/* Monitor stand */}
      <rect x="56" y="30" width="8" height="10" rx="1" fill="#222222" />
      {/* Monitor base */}
      <rect x="48" y="37" width="24" height="4" rx="2" fill="#222222" />
      {/* Monitor */}
      <rect x="30" y="2" width="60" height="30" rx="3" fill="#1a1a1a" stroke="#333333" strokeWidth="1" />
      {/* Screen */}
      <rect x="33" y="5" width="54" height="24" rx="2" fill={active ? "#0f1729" : "#111111"} />
      {active && (
        <>
          {/* Code lines on screen */}
          <rect x="37" y="9" width="30" height="2" rx="1" fill={color.body} opacity="0.4" />
          <rect x="37" y="13" width="42" height="2" rx="1" fill={color.body} opacity="0.25" />
          <rect x="37" y="17" width="25" height="2" rx="1" fill={color.body} opacity="0.35" />
          <rect x="37" y="21" width="38" height="2" rx="1" fill={color.body} opacity="0.2" />
          {/* Cursor blink */}
          <rect x="62" y="17" width="2" height="2" fill={color.eye}>
            <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
          </rect>
        </>
      )}
      {/* Keyboard */}
      <rect x="38" y="42" width="28" height="4" rx="1" fill="#161616" />
      {/* Mouse */}
      <rect x="72" y="42" width="6" height="4" rx="2" fill="#161616" />
      {/* Coffee mug */}
      <rect x="14" y="34" width="8" height="7" rx="2" fill="#222222" />
      <rect x="22" y="36" width="3" height="3" rx="1.5" fill="none" stroke="#333333" strokeWidth="1" />
      {/* Steam from coffee */}
      {active && (
        <>
          <path d="M16 33 Q17 30 18 33" stroke="#33333380" strokeWidth="0.8" fill="none">
            <animate attributeName="d" values="M16 33 Q17 30 18 33;M16 31 Q17 28 18 31;M16 33 Q17 30 18 33" dur="3s" repeatCount="indefinite" />
          </path>
        </>
      )}
      {/* Small plant pot */}
      <rect x="96" y="34" width="10" height="7" rx="2" fill="#1a3a1a" />
      <circle cx="101" cy="32" r="4" fill="#22c55e" opacity="0.5" />
      <circle cx="99" cy="30" r="3" fill="#22c55e" opacity="0.4" />
      <circle cx="103" cy="30" r="3" fill="#22c55e" opacity="0.4" />
    </svg>
  );
}

// ─── Agent Desk Unit ──────────────────────────────────────────────────────────

function AgentDesk({
  agent,
  activity,
  onClick,
  selected,
}: {
  agent: Agent;
  activity: string;
  onClick: () => void;
  selected: boolean;
}) {
  const color = ROBOT_COLORS[agent.agent_id] || DEFAULT_COLOR;
  const isActive = agent.status === "active";

  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative flex flex-col items-center transition-all duration-300 group",
        selected ? "scale-105 z-10" : "hover:scale-105 hover:z-10"
      )}
    >
      {/* Activity bubble */}
      <div
        className={clsx(
          "absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all duration-300 z-20",
          "bg-[#1a1a1a] border text-[#888888]",
          selected ? "opacity-100 border-[#333333]" : "opacity-0 group-hover:opacity-100 border-[#222222]"
        )}
        style={selected ? { borderColor: `${color.body}40`, color: color.eye } : {}}
      >
        {activity}
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#1a1a1a] border-r border-b"
          style={{ borderColor: selected ? `${color.body}40` : "#222222" }}
        />
      </div>

      {/* Robot */}
      <div className="relative mb-[-12px] z-10">
        <Robot color={color} size={50} />
        {/* Status indicator */}
        <div
          className={clsx(
            "absolute -bottom-0 right-1 w-3 h-3 rounded-full border-2 border-[#0a0a0a]",
            isActive ? "bg-emerald-500" : "bg-[#555555]"
          )}
        />
      </div>

      {/* Desk */}
      <Desk color={color} active={isActive} />

      {/* Name */}
      <span
        className="text-[12px] font-medium mt-1 transition-colors"
        style={{ color: selected ? color.body : "#f5f5f5" }}
      >
        {agent.name}
      </span>
      <span className="text-[9px] text-[#555555]">
        {agent.role.split("—")[0].split("—")[0].trim().slice(0, 20)}
      </span>
    </button>
  );
}

// ─── Decorative Elements ──────────────────────────────────────────────────────

function Plant({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const h = size === "sm" ? 30 : size === "lg" ? 50 : 40;
  return (
    <svg width={h} height={h} viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="13" y="35" width="14" height="12" rx="3" fill="#92400e" opacity="0.5" />
      <rect x="12" y="33" width="16" height="4" rx="2" fill="#92400e" opacity="0.6" />
      <circle cx="20" cy="26" r="10" fill="#22c55e" opacity="0.35" />
      <circle cx="16" cy="22" r="7" fill="#22c55e" opacity="0.3" />
      <circle cx="24" cy="22" r="7" fill="#22c55e" opacity="0.3" />
      <circle cx="20" cy="18" r="6" fill="#22c55e" opacity="0.25" />
      <line x1="20" y1="33" x2="20" y2="26" stroke="#166534" strokeWidth="2" />
    </svg>
  );
}

function WaterCooler() {
  return (
    <svg width="35" height="55" viewBox="0 0 35 55" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Base */}
      <rect x="5" y="38" width="25" height="15" rx="2" fill="#1a1a1a" />
      {/* Water tank */}
      <rect x="9" y="8" width="17" height="30" rx="4" fill="#0ea5e9" opacity="0.15" stroke="#0ea5e9" strokeWidth="0.5" strokeOpacity="0.3" />
      {/* Water level */}
      <rect x="10" y="15" width="15" height="22" rx="3" fill="#0ea5e9" opacity="0.1" />
      {/* Bubbles */}
      <circle cx="15" cy="25" r="1" fill="#0ea5e9" opacity="0.3">
        <animate attributeName="cy" values="28;18;28" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="20" cy="22" r="0.7" fill="#0ea5e9" opacity="0.2">
        <animate attributeName="cy" values="25;15;25" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* Tap */}
      <rect x="15" y="38" width="5" height="3" rx="1" fill="#333333" />
    </svg>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

interface ActivityItem {
  agent: string;
  color: string;
  action: string;
  detail: string;
  time: string;
}

function generateActivities(agents: Agent[]): ActivityItem[] {
  const actions = [
    { action: "task completed", details: ["Finished smoke test suite", "Updated test plan", "Reviewed findings"] },
    { action: "scanning", details: ["Checking auth headers", "Running OWASP checks", "Auditing endpoints"] },
    { action: "report filed", details: ["QA summary for sprint 1", "Security audit v2", "Bug report #42"] },
    { action: "working", details: ["Processing test queue", "Analyzing results", "Generating report"] },
    { action: "online", details: ["Ready for assignments", "Standing by", "Initialized"] },
  ];

  return agents
    .filter((a) => a.status === "active")
    .map((a) => {
      const act = actions[Math.floor(Math.random() * actions.length)];
      const detail = act.details[Math.floor(Math.random() * act.details.length)];
      const color = (ROBOT_COLORS[a.agent_id] || DEFAULT_COLOR).body;
      const mins = Math.floor(Math.random() * 30);
      return {
        agent: a.name,
        color,
        action: act.action,
        detail,
        time: mins === 0 ? "just now" : `${mins}m ago`,
      };
    })
    .sort(() => Math.random() - 0.5);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OfficePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [activities, setActivities] = useState<Record<string, string>>({});
  const [feed, setFeed] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetch("/api/deploy-agent")
      .then((r) => r.json())
      .then((data: Agent[]) => {
        const active = data.filter((a) => a.status !== "retired");
        setAgents(active);
        // Generate activities
        const acts: Record<string, string> = {};
        active.forEach((a) => {
          acts[a.agent_id] = getActivity(a.agent_id);
        });
        setActivities(acts);
        setFeed(generateActivities(active));
      })
      .catch(() => {});
  }, []);

  // Rotate activities every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActivities((prev) => {
        const next = { ...prev };
        // Rotate one random agent's activity
        const ids = Object.keys(next);
        if (ids.length > 0) {
          const id = ids[Math.floor(Math.random() * ids.length)];
          next[id] = getActivity(id);
        }
        return next;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const activeAgents = agents.filter((a) => a.status === "active");
  const selected = agents.find((a) => a.agent_id === selectedAgent);

  // Arrange desks in rows
  const rows: Agent[][] = [];
  const perRow = 3;
  for (let i = 0; i < activeAgents.length; i += perRow) {
    rows.push(activeAgents.slice(i, i + perRow));
  }

  return (
    <div className="max-w-full mx-auto space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">🏢 The Office</h1>
          <p className="text-sm text-[#555555] mt-0.5">
            {activeAgents.length} agent{activeAgents.length !== 1 ? "s" : ""} at work
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-md">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-[#888888]">All systems operational</span>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Office Floor */}
        <div className="flex-1 relative">
          <div
            className="rounded-xl border border-[#1a1a1a] p-8 relative overflow-hidden"
            style={{
              background: `
                linear-gradient(135deg, #0c0c0c 0%, #0a0a0a 50%, #0c0c0c 100%)
              `,
              backgroundSize: "100% 100%",
            }}
          >
            {/* Grid floor pattern */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `
                  linear-gradient(#ffffff 1px, transparent 1px),
                  linear-gradient(90deg, #ffffff 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
              }}
            />

            {/* Ceiling lights */}
            <div className="absolute top-0 left-0 right-0 flex justify-around px-20 py-0">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-20 h-1 rounded-full bg-[#ffffff08]" />
              ))}
            </div>

            {/* Decorative elements */}
            <div className="absolute top-6 left-6">
              <Plant size="lg" />
            </div>
            <div className="absolute bottom-6 right-6">
              <Plant size="md" />
            </div>
            <div className="absolute top-6 right-8">
              <WaterCooler />
            </div>
            <div className="absolute bottom-6 left-6">
              <Plant size="sm" />
            </div>

            {/* Agent Desks */}
            <div className="relative z-10 space-y-16 py-8">
              {rows.map((row, rowIdx) => (
                <div key={rowIdx} className="flex items-end justify-center gap-16">
                  {row.map((agent) => (
                    <AgentDesk
                      key={agent.agent_id}
                      agent={agent}
                      activity={activities[agent.agent_id] || "Idle"}
                      selected={selectedAgent === agent.agent_id}
                      onClick={() =>
                        setSelectedAgent(
                          selectedAgent === agent.agent_id ? null : agent.agent_id
                        )
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Agent Cards Bar */}
          <div className="mt-4 grid grid-cols-5 gap-2">
            {activeAgents.map((agent) => {
              const color = ROBOT_COLORS[agent.agent_id] || DEFAULT_COLOR;
              const isSelected = selectedAgent === agent.agent_id;
              return (
                <button
                  key={agent.agent_id}
                  onClick={() =>
                    setSelectedAgent(
                      selectedAgent === agent.agent_id ? null : agent.agent_id
                    )
                  }
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-md border transition-all text-left",
                    isSelected
                      ? "bg-[#111111] border-opacity-60"
                      : "bg-[#0a0a0a] border-[#1a1a1a] hover:bg-[#111111] hover:border-[#222222]"
                  )}
                  style={isSelected ? { borderColor: color.body } : {}}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: `${color.body}20`, color: color.body }}
                  >
                    {agent.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-[#f5f5f5] truncate">{agent.name}</p>
                    <p className="text-[9px] text-[#555555] truncate">
                      {activities[agent.agent_id] || "Idle"}
                    </p>
                  </div>
                  <div
                    className={clsx(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      agent.status === "active" ? "bg-emerald-500" : "bg-[#555555]"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Activity Feed Sidebar */}
        <div className="w-64 shrink-0">
          <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden sticky top-6">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <span className="text-[13px]">⚡</span>
                <span className="text-[13px] font-medium text-[#f5f5f5]">Live Activity</span>
              </div>
              <span className="text-[10px] text-[#555555]">Last hour</span>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {feed.map((item, idx) => (
                <div
                  key={idx}
                  className="px-4 py-3 hover:bg-[#1a1a1a] transition-colors cursor-default"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[12px] font-medium text-[#f5f5f5]">
                      {item.agent}
                    </span>
                    <span className="text-[10px] text-[#555555]">· {item.action}</span>
                  </div>
                  <p className="text-[11px] text-[#888888] ml-4">{item.detail}</p>
                  <p className="text-[9px] text-[#444444] ml-4 mt-0.5">{item.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Agent Detail */}
          {selected && (
            <div
              className="mt-3 bg-[#111111] border rounded-md p-4 space-y-3"
              style={{ borderColor: `${(ROBOT_COLORS[selected.agent_id] || DEFAULT_COLOR).body}40` }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold"
                  style={{
                    backgroundColor: `${(ROBOT_COLORS[selected.agent_id] || DEFAULT_COLOR).body}20`,
                    color: (ROBOT_COLORS[selected.agent_id] || DEFAULT_COLOR).body,
                  }}
                >
                  {selected.name[0]}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#f5f5f5]">{selected.name}</p>
                  <p className="text-[10px] text-[#555555] font-mono">{selected.agent_id}</p>
                </div>
              </div>
              <p className="text-[11px] text-[#888888] leading-relaxed">{selected.role}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#888888]">
                  {selected.model.replace("anthropic/", "")}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#888888]">
                  {selected.division === "none" ? "Core" : selected.division}
                </span>
              </div>
              {selected.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selected.skills.map((s) => (
                    <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-sm bg-[#0a0a0a] text-[#666666]">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
