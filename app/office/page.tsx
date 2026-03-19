"use client";

import { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import { Plus, X, Loader2, CheckCircle2, Clock, AlertCircle, RefreshCw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  agent_id: string;
  name: string;
  role: string;
  model: string;
  division: string;
  status: string;
  skills: string[];
  tools: string[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string | null;
  created_at: string;
}

interface ActivityItem {
  id: string;
  agent_id: string;
  action: string;
  detail: string;
  created_at: string;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const ROBOT_COLORS: Record<string, { body: string; glow: string; eye: string }> = {
  main:             { body: "#5e6ad2", glow: "#5e6ad230", eye: "#a5b4fc" },
  "qa-lead":        { body: "#f59e0b", glow: "#f59e0b30", eye: "#fde68a" },
  "qa-functional":  { body: "#10b981", glow: "#10b98130", eye: "#6ee7b7" },
  "qa-security":    { body: "#ef4444", glow: "#ef444430", eye: "#fca5a5" },
  "qa-general":     { body: "#06b6d4", glow: "#06b6d430", eye: "#67e8f9" },
};
const DEFAULT_COLOR = { body: "#8b5cf6", glow: "#8b5cf630", eye: "#c4b5fd" };

function getColor(id: string) { return ROBOT_COLORS[id] || DEFAULT_COLOR; }

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-400", high: "text-orange-400", medium: "text-yellow-400", low: "text-[#888888]"
};

// ─── SVG Components ───────────────────────────────────────────────────────────

function Robot({ color, size = 50 }: { color: { body: string; eye: string }; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <line x1="30" y1="10" x2="30" y2="4" stroke={color.body} strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="3" r="2.5" fill={color.body}><animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" /></circle>
      <rect x="16" y="10" width="28" height="22" rx="6" fill={color.body} />
      <rect x="20" y="15" width="20" height="10" rx="3" fill="#0a0a0a" opacity="0.7" />
      <circle cx="25" cy="20" r="2.5" fill={color.eye}><animate attributeName="r" values="2.5;2.5;0.5;2.5;2.5" dur="4s" repeatCount="indefinite" /></circle>
      <circle cx="35" cy="20" r="2.5" fill={color.eye}><animate attributeName="r" values="2.5;2.5;0.5;2.5;2.5" dur="4s" repeatCount="indefinite" /></circle>
      <rect x="19" y="33" width="22" height="16" rx="4" fill={color.body} opacity="0.85" />
      <circle cx="30" cy="40" r="2" fill={color.eye} opacity="0.6"><animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" /></circle>
      <rect x="11" y="35" width="7" height="3" rx="1.5" fill={color.body} opacity="0.7" />
      <rect x="42" y="35" width="7" height="3" rx="1.5" fill={color.body} opacity="0.7" />
      <rect x="23" y="49" width="5" height="6" rx="2" fill={color.body} opacity="0.7" />
      <rect x="32" y="49" width="5" height="6" rx="2" fill={color.body} opacity="0.7" />
    </svg>
  );
}

function Desk({ color, working }: { color: { body: string; eye: string }; working: boolean }) {
  return (
    <svg width="120" height="70" viewBox="0 0 120 70" fill="none">
      <rect x="5" y="40" width="110" height="8" rx="2" fill="#1a1a1a" />
      <rect x="12" y="48" width="4" height="20" rx="1" fill="#161616" />
      <rect x="104" y="48" width="4" height="20" rx="1" fill="#161616" />
      <rect x="56" y="30" width="8" height="10" rx="1" fill="#222222" />
      <rect x="48" y="37" width="24" height="4" rx="2" fill="#222222" />
      <rect x="30" y="2" width="60" height="30" rx="3" fill="#1a1a1a" stroke="#333333" strokeWidth="1" />
      <rect x="33" y="5" width="54" height="24" rx="2" fill={working ? "#0f1729" : "#111111"} />
      {working && (
        <>
          <rect x="37" y="9" width="30" height="2" rx="1" fill={color.body} opacity="0.4" />
          <rect x="37" y="13" width="42" height="2" rx="1" fill={color.body} opacity="0.25" />
          <rect x="37" y="17" width="25" height="2" rx="1" fill={color.body} opacity="0.35" />
          <rect x="37" y="21" width="38" height="2" rx="1" fill={color.body} opacity="0.2" />
          <rect x="62" y="17" width="2" height="2" fill={color.eye}><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" /></rect>
        </>
      )}
      <rect x="38" y="42" width="28" height="4" rx="1" fill="#161616" />
      <rect x="72" y="42" width="6" height="4" rx="2" fill="#161616" />
      <rect x="14" y="34" width="8" height="7" rx="2" fill="#222222" />
      <rect x="22" y="36" width="3" height="3" rx="1.5" fill="none" stroke="#333333" strokeWidth="1" />
      {working && <path d="M16 33 Q17 30 18 33" stroke="#33333380" strokeWidth="0.8" fill="none"><animate attributeName="d" values="M16 33 Q17 30 18 33;M16 31 Q17 28 18 31;M16 33 Q17 30 18 33" dur="3s" repeatCount="indefinite" /></path>}
      <rect x="96" y="34" width="10" height="7" rx="2" fill="#1a3a1a" />
      <circle cx="101" cy="32" r="4" fill="#22c55e" opacity="0.5" />
      <circle cx="99" cy="30" r="3" fill="#22c55e" opacity="0.4" />
    </svg>
  );
}

function Plant() {
  return (
    <svg width="40" height="50" viewBox="0 0 40 50" fill="none">
      <rect x="13" y="35" width="14" height="12" rx="3" fill="#92400e" opacity="0.5" />
      <rect x="12" y="33" width="16" height="4" rx="2" fill="#92400e" opacity="0.6" />
      <circle cx="20" cy="26" r="10" fill="#22c55e" opacity="0.35" />
      <circle cx="16" cy="22" r="7" fill="#22c55e" opacity="0.3" />
      <circle cx="24" cy="22" r="7" fill="#22c55e" opacity="0.3" />
      <line x1="20" y1="33" x2="20" y2="26" stroke="#166534" strokeWidth="2" />
    </svg>
  );
}

// ─── Agent Desk ───────────────────────────────────────────────────────────────

function AgentDesk({
  agent,
  currentTask,
  lastActivity,
  selected,
  onClick,
}: {
  agent: Agent;
  currentTask: Task | null;
  lastActivity: string;
  selected: boolean;
  onClick: () => void;
}) {
  const color = getColor(agent.agent_id);
  const working = !!currentTask;

  return (
    <button onClick={onClick} className={clsx("relative flex flex-col items-center transition-all duration-300 group", selected ? "scale-105 z-10" : "hover:scale-105 hover:z-10")}>
      {/* Task/activity bubble */}
      <div className={clsx(
        "absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap transition-all duration-300 z-20 max-w-[180px] truncate",
        "bg-[#1a1a1a] border",
        working ? "border-[#5e6ad2]/40 text-[#f5f5f5] font-medium opacity-100" : "border-[#222222] text-[#888888]",
        !selected && !working && "opacity-0 group-hover:opacity-100"
      )} style={selected ? { borderColor: `${color.body}60`, opacity: 1 } : {}}>
        {working ? (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5e6ad2] animate-pulse" />
            {currentTask.title.slice(0, 30)}
          </span>
        ) : (
          lastActivity || "Idle — ready for tasks"
        )}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#1a1a1a] border-r border-b" style={{ borderColor: working ? "#5e6ad240" : "#222222" }} />
      </div>

      <div className="relative mb-[-12px] z-10">
        <Robot color={color} />
        <div className={clsx("absolute -bottom-0 right-1 w-3 h-3 rounded-full border-2 border-[#0a0a0a]", working ? "bg-[#5e6ad2] animate-pulse" : agent.status === "active" ? "bg-emerald-500" : "bg-[#555555]")} />
      </div>

      <Desk color={color} working={working} />

      <span className="text-[12px] font-medium mt-1 transition-colors" style={{ color: selected ? color.body : "#f5f5f5" }}>{agent.name}</span>
      <span className="text-[9px] text-[#555555]">{working ? "Working" : "Idle"}</span>
    </button>
  );
}

// ─── Agent Detail Panel ───────────────────────────────────────────────────────

function AgentPanel({
  agent,
  tasks,
  activities,
  agents,
  onClose,
  onAssign,
}: {
  agent: Agent;
  tasks: Task[];
  activities: ActivityItem[];
  agents: Agent[];
  onClose: () => void;
  onAssign: (taskTitle: string, agentId: string) => void;
}) {
  const color = getColor(agent.agent_id);
  const agentTasks = tasks.filter((t) => t.assignee === agent.agent_id);
  const agentActivities = activities.filter((a) => a.agent_id === agent.agent_id).slice(0, 5);
  const activeTasks = agentTasks.filter((t) => t.status === "in_progress");
  const completedTasks = agentTasks.filter((t) => t.status === "done");
  const pendingTasks = agentTasks.filter((t) => t.status === "pending");

  const [showAssign, setShowAssign] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  return (
    <div className="bg-[#111111] border rounded-lg p-4 w-72 shadow-xl space-y-3 max-h-[80vh] overflow-y-auto" style={{ borderColor: `${color.body}40` }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color.body}20`, color: color.body }}>
            <span className="text-[13px] font-bold">{agent.name[0]}</span>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#f5f5f5]">{agent.name}</div>
            <div className="text-[10px] text-[#555555]">{agent.role.split("—")[0].trim()}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-[#555555] hover:text-[#888888]">✕</button>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#0a0a0a] rounded-md p-2 text-center">
          <div className="text-[16px] font-semibold text-[#5e6ad2]">{activeTasks.length}</div>
          <div className="text-[9px] text-[#555555]">Active</div>
        </div>
        <div className="bg-[#0a0a0a] rounded-md p-2 text-center">
          <div className="text-[16px] font-semibold text-yellow-400">{pendingTasks.length}</div>
          <div className="text-[9px] text-[#555555]">Pending</div>
        </div>
        <div className="bg-[#0a0a0a] rounded-md p-2 text-center">
          <div className="text-[16px] font-semibold text-emerald-400">{completedTasks.length}</div>
          <div className="text-[9px] text-[#555555]">Done</div>
        </div>
      </div>

      {/* Current Tasks */}
      {agentTasks.filter((t) => t.status !== "done").length > 0 && (
        <div>
          <p className="text-[10px] text-[#555555] uppercase tracking-wider font-medium mb-1.5">Current Tasks</p>
          <div className="space-y-1">
            {agentTasks.filter((t) => t.status !== "done").map((task) => (
              <div key={task.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md px-2.5 py-1.5">
                <div className="flex items-center gap-1.5">
                  {task.status === "in_progress" ? (
                    <Clock className="w-3 h-3 text-[#5e6ad2] animate-pulse shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-yellow-400 shrink-0" />
                  )}
                  <span className="text-[11px] text-[#f5f5f5] truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={clsx("text-[9px]", PRIORITY_COLORS[task.priority])}>{task.priority}</span>
                  <span className="text-[9px] text-[#444444]">{task.status.replace("_", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {agentActivities.length > 0 && (
        <div>
          <p className="text-[10px] text-[#555555] uppercase tracking-wider font-medium mb-1.5">Recent Activity</p>
          <div className="space-y-1">
            {agentActivities.map((a) => (
              <div key={a.id} className="text-[10px]">
                <span className="text-[#888888]">{a.action.replace(/_/g, " ")}</span>
                {a.detail && <span className="text-[#555555]"> — {a.detail.slice(0, 40)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Assign */}
      <div>
        {showAssign ? (
          <div className="space-y-2">
            <input
              className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-2.5 py-1.5 text-[12px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2]"
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newTaskTitle.trim()) { onAssign(newTaskTitle, agent.agent_id); setNewTaskTitle(""); setShowAssign(false); } }}
              autoFocus
            />
            <div className="flex gap-1.5">
              <button onClick={() => { if (newTaskTitle.trim()) { onAssign(newTaskTitle, agent.agent_id); setNewTaskTitle(""); setShowAssign(false); } }}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[11px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white transition-all">
                <Plus className="w-3 h-3" /> Assign
              </button>
              <button onClick={() => setShowAssign(false)}
                className="px-2 py-1 rounded-md text-[11px] text-[#555555] hover:text-[#888888] hover:bg-[#1a1a1a] transition-all">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAssign(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] bg-[#1a1a1a] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] transition-all">
            <Plus className="w-3 h-3" /> Assign Task
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OfficePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [agentsRes, tasksRes, actRes] = await Promise.all([
        fetch("/api/deploy-agent"),
        fetch("/api/tasks"),
        fetch("/api/activities?limit=30"),
      ]);
      const agentsData = await agentsRes.json();
      const tasksData = await tasksRes.json();
      const actData = await actRes.json();
      setAgents(agentsData.filter((a: Agent) => a.status === "active"));
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setActivities(Array.isArray(actData) ? actData : []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const selected = agents.find((a) => a.agent_id === selectedAgent);

  // Get current task and last activity for each agent
  function agentCurrentTask(agentId: string): Task | null {
    return tasks.find((t) => t.assignee === agentId && t.status === "in_progress") || null;
  }

  function agentLastActivity(agentId: string): string {
    const act = activities.find((a) => a.agent_id === agentId);
    if (!act) return "";
    return `${act.action.replace(/_/g, " ")}${act.detail ? ": " + act.detail.slice(0, 25) : ""}`;
  }

  function agentName(id: string): string {
    return agents.find((a) => a.agent_id === id)?.name || id;
  }

  function timeAgo(str: string): string {
    if (!str) return "";
    const mins = Math.floor((Date.now() - new Date(str.replace(" ", "T")).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }

  async function assignTask(title: string, agentId: string) {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, assignee: agentId, priority: "medium" }),
    });
    loadData();
  }

  // Stats
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((t) => t.status === "in_progress").length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const workingAgents = agents.filter((a) => agentCurrentTask(a.agent_id)).length;

  // Layout agents in rows
  const rows: Agent[][] = [];
  const perRow = 3;
  for (let i = 0; i < agents.length; i += perRow) {
    rows.push(agents.slice(i, i + perRow));
  }

  return (
    <div className="max-w-full mx-auto space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">🏢 The Office</h1>
          <p className="text-sm text-[#555555] mt-0.5">
            {workingAgents} working · {agents.length - workingAgents} idle · {activeTasks} active task{activeTasks !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setLoading(true); loadData(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] bg-[#1a1a1a] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] transition-all">
            <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
          <div className="flex items-center gap-3 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-md">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="text-[11px] text-[#888888]">{doneTasks} done</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#5e6ad2]" />
              <span className="text-[11px] text-[#888888]">{activeTasks} active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-yellow-400" />
              <span className="text-[11px] text-[#888888]">{totalTasks - doneTasks - activeTasks} pending</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Office Floor */}
        <div className="flex-1 relative">
          <div className="rounded-xl border border-[#1a1a1a] p-8 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0c0c0c 0%, #0a0a0a 50%, #0c0c0c 100%)" }}>
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }} />

            <div className="absolute top-6 left-6"><Plant /></div>
            <div className="absolute bottom-6 right-6"><Plant /></div>

            <div className="relative z-10 space-y-16 py-8">
              {rows.map((row, rowIdx) => (
                <div key={rowIdx} className="flex items-end justify-center gap-16">
                  {row.map((agent) => (
                    <AgentDesk
                      key={agent.agent_id}
                      agent={agent}
                      currentTask={agentCurrentTask(agent.agent_id)}
                      lastActivity={agentLastActivity(agent.agent_id)}
                      selected={selectedAgent === agent.agent_id}
                      onClick={() => setSelectedAgent(selectedAgent === agent.agent_id ? null : agent.agent_id)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom agent bar */}
          <div className="mt-4 grid grid-cols-5 gap-2">
            {agents.map((agent) => {
              const color = getColor(agent.agent_id);
              const task = agentCurrentTask(agent.agent_id);
              const isSelected = selectedAgent === agent.agent_id;
              return (
                <button key={agent.agent_id}
                  onClick={() => setSelectedAgent(isSelected ? null : agent.agent_id)}
                  className={clsx("flex items-center gap-2 px-3 py-2 rounded-md border transition-all text-left",
                    isSelected ? "bg-[#111111]" : "bg-[#0a0a0a] border-[#1a1a1a] hover:bg-[#111111] hover:border-[#222222]"
                  )} style={isSelected ? { borderColor: color.body } : {}}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: `${color.body}20`, color: color.body }}>{agent.name[0]}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-[#f5f5f5] truncate">{agent.name}</p>
                    <p className="text-[9px] text-[#555555] truncate">{task ? task.title.slice(0, 20) : "Idle"}</p>
                  </div>
                  <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", task ? "bg-[#5e6ad2] animate-pulse" : "bg-emerald-500")} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Activity Feed or Agent Detail */}
        <div className="w-72 shrink-0 space-y-3">
          {selected ? (
            <AgentPanel
              agent={selected}
              tasks={tasks}
              activities={activities}
              agents={agents}
              onClose={() => setSelectedAgent(null)}
              onAssign={assignTask}
            />
          ) : (
            <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#222222]">
                <span className="text-[13px] font-medium text-[#f5f5f5]">⚡ Activity</span>
                <span className="text-[10px] text-[#555555]">real-time</span>
              </div>
              <div className="divide-y divide-[#1a1a1a] max-h-[500px] overflow-y-auto">
                {activities.length === 0 && (
                  <div className="px-4 py-8 text-center"><p className="text-[12px] text-[#555555]">No activity yet</p></div>
                )}
                {activities.slice(0, 15).map((item) => (
                  <div key={item.id} className="px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getColor(item.agent_id).body }} />
                      <span className="text-[11px] font-medium text-[#f5f5f5]">{agentName(item.agent_id)}</span>
                    </div>
                    <p className="text-[10px] text-[#888888] ml-3.5">{item.action.replace(/_/g, " ")}{item.detail ? ` — ${item.detail.slice(0, 40)}` : ""}</p>
                    <p className="text-[9px] text-[#444444] ml-3.5 mt-0.5">{timeAgo(item.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
