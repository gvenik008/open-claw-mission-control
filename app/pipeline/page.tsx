"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, GitBranch, Clock, User, ChevronDown, ChevronRight, Filter, TrendingUp, CheckCircle, Loader2, AlertCircle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string | null;
  created_by: string;
  due_date: string | null;
  completed_at: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
  result?: string;
}

interface Agent {
  agent_id: string;
  name: string;
  status: string;
}

const PIPELINE_STAGES = [
  { key: "pending", label: "Pending", color: "text-[#888888]", bg: "bg-[#888888]/10", border: "border-[#888888]/20" },
  { key: "in_progress", label: "In Progress", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { key: "review", label: "Review", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { key: "done", label: "Done", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-400 bg-red-500/10",
  high: "text-orange-400 bg-orange-500/10",
  medium: "text-yellow-400 bg-yellow-500/10",
  low: "text-[#888888] bg-[#222222]",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "P0",
  high: "P1",
  medium: "P2",
  low: "P3",
};

function formatRelative(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function AgentAvatar({ name }: { name: string }) {
  const initials = name
    .split(/[-_\s]/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="w-5 h-5 rounded-full bg-[#5e6ad2]/20 border border-[#5e6ad2]/30 flex items-center justify-center">
      <span className="text-[8px] font-bold text-[#5e6ad2]">{initials}</span>
    </div>
  );
}

export default function PipelinePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, activitiesRes, agentsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/activities?limit=50"),
        fetch("/api/deploy-agent"),
      ]);
      const tasksData = await tasksRes.json();
      const activitiesData = await activitiesRes.json();
      const agentsData = await agentsRes.json();
      setTasks(Array.isArray(tasksData) ? tasksData : tasksData.tasks || []);
      setActivities(Array.isArray(activitiesData) ? activitiesData : activitiesData.activities || []);
      setAgents(Array.isArray(agentsData) ? agentsData : agentsData.agents || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const filteredTasks = tasks.filter((t) => {
    if (filterAgent !== "all" && t.assignee !== filterAgent) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const tasksByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.key] = filteredTasks.filter((t) => t.status === stage.key);
    return acc;
  }, {} as Record<string, Task[]>);

  const totalTasks = filteredTasks.length;
  const doneTasks = filteredTasks.filter((t) => t.status === "done").length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const activeTasks = filteredTasks.filter((t) => t.status === "in_progress").length;

  const activeAgentIds = new Set(filteredTasks.filter((t) => t.status === "in_progress").map((t) => t.assignee).filter(Boolean));

  return (
    <div className="p-6 min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Pipeline</h1>
          <p className="text-sm text-[#555555] mt-0.5">Task execution workflow across agents</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-md text-[13px] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Tasks", value: totalTasks, icon: GitBranch, color: "text-[#5e6ad2]" },
          { label: "Completion Rate", value: `${completionRate}%`, icon: TrendingUp, color: "text-emerald-400" },
          { label: "Active Tasks", value: activeTasks, icon: Loader2, color: "text-blue-400" },
          { label: "Active Agents", value: activeAgentIds.size, icon: User, color: "text-orange-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#111111] border border-[#222222] rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-[#555555]">{stat.label}</span>
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            </div>
            <div className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <Filter className="w-3.5 h-3.5 text-[#555555]" />
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="bg-[#111111] border border-[#222222] rounded-md px-3 py-1.5 text-[13px] text-[#888888] outline-none focus:border-[#333333]"
        >
          <option value="all">All Agents</option>
          {agents.map((a) => (
            <option key={a.agent_id} value={a.agent_id}>{a.name}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-[#111111] border border-[#222222] rounded-md px-3 py-1.5 text-[13px] text-[#888888] outline-none focus:border-[#333333]"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent (P0)</option>
          <option value="high">High (P1)</option>
          <option value="medium">Medium (P2)</option>
          <option value="low">Low (P3)</option>
        </select>
        <span className="text-[12px] text-[#555555] ml-auto">{filteredTasks.length} tasks</span>
      </div>

      {/* Pipeline kanban */}
      <div className="grid grid-cols-4 gap-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageTasks = tasksByStage[stage.key] || [];
          return (
            <div key={stage.key}>
              {/* Stage header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-md mb-3 ${stage.bg} border ${stage.border}`}>
                <span className={`text-[12px] font-medium ${stage.color}`}>{stage.label}</span>
                <span className={`text-[11px] font-semibold ${stage.color}`}>{stageTasks.length}</span>
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                {stageTasks.length === 0 ? (
                  <div className="border border-dashed border-[#222222] rounded-md p-4 text-center">
                    <p className="text-[11px] text-[#444444]">No tasks</p>
                  </div>
                ) : (
                  stageTasks.map((task) => {
                    const isExpanded = expandedId === task.id;
                    const isActive = task.status === "in_progress";
                    let tags: string[] = [];
                    try { tags = JSON.parse(task.tags || "[]"); } catch {}

                    return (
                      <div
                        key={task.id}
                        className={`bg-[#111111] border rounded-md transition-all cursor-pointer ${
                          isActive
                            ? "border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.05)]"
                            : "border-[#222222] hover:border-[#333333]"
                        }`}
                        onClick={() => setExpandedId(isExpanded ? null : task.id)}
                      >
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-[12px] text-[#f5f5f5] font-medium leading-snug flex-1">{task.title}</p>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low}`}>
                              {PRIORITY_LABELS[task.priority] || task.priority}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            {task.assignee ? (
                              <div className="flex items-center gap-1.5">
                                <AgentAvatar name={task.assignee} />
                                <span className="text-[10px] text-[#555555] truncate max-w-[80px]">{task.assignee}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[#444444]">Unassigned</span>
                            )}
                            <div className="flex items-center gap-1 text-[10px] text-[#444444]">
                              <Clock className="w-2.5 h-2.5" />
                              {formatRelative(task.updated_at)}
                            </div>
                          </div>
                          {isActive && (
                            <div className="mt-2 flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                              <span className="text-[10px] text-blue-400">Running</span>
                            </div>
                          )}
                        </div>
                        {isExpanded && (
                          <div className="border-t border-[#222222] p-3 space-y-2">
                            {task.description && (
                              <p className="text-[11px] text-[#888888]">{task.description}</p>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-[9px] uppercase tracking-wider text-[#555555]">Created</span>
                                <p className="text-[#888888]">{formatRelative(task.created_at)}</p>
                              </div>
                              {task.completed_at && (
                                <div>
                                  <span className="text-[9px] uppercase tracking-wider text-[#555555]">Completed</span>
                                  <p className="text-emerald-400">{formatRelative(task.completed_at)}</p>
                                </div>
                              )}
                            </div>
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {tags.map((tag) => (
                                  <span key={tag} className="text-[9px] bg-[#1a1a1a] text-[#555555] px-1.5 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
