"use client";

import { useEffect, useState } from "react";
import { Activity, Bot, Wrench, CheckSquare, Sparkles, Wifi, WifiOff, Plus, Factory, BarChart2, GitBranch, FileText, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

interface StatCard {
  label: string;
  value: number;
  icon: any;
}

interface ActivityItem {
  id: string;
  agent_id: string;
  action: string;
  detail: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  assignee: string | null;
}

interface Report {
  id?: string;
  filename: string;
  title?: string;
  type?: string;
  created_at?: string;
}

export default function Dashboard() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ agents: 0, skills: 0, tools: 0, tasks: 0 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [agents, setAgents] = useState<Record<string, string>>({});
  const [inProgressTasks, setInProgressTasks] = useState<Task[]>([]);
  const [recentReports, setRecentReports] = useState<Report[]>([]);

  useEffect(() => {
    // Check gateway + load agents
    fetch("/api/deploy-agent")
      .then((r) => { setConnected(r.ok); return r.json(); })
      .then((data) => {
        const active = data.filter((a: any) => a.status === "active");
        setStats((s) => ({ ...s, agents: active.length }));
        const map: Record<string, string> = {};
        data.forEach((a: any) => { map[a.agent_id] = a.name; });
        setAgents(map);
      })
      .catch(() => setConnected(false));

    // Load stats
    fetch("/api/skills").then((r) => r.json()).then((d) => setStats((s) => ({ ...s, skills: d.length }))).catch(() => {});
    fetch("/api/tools").then((r) => r.json()).then((d) => setStats((s) => ({ ...s, tools: d.length }))).catch(() => {});
    fetch("/api/tasks").then((r) => r.json()).then((d) => {
      setStats((s) => ({ ...s, tasks: d.length }));
      setInProgressTasks((Array.isArray(d) ? d : []).filter((t: Task) => t.status === "in_progress"));
    }).catch(() => {});

    // Load activities
    fetch("/api/activities?limit=10").then((r) => r.json()).then(setActivities).catch(() => {});

    // Load recent reports
    fetch("/api/reports").then((r) => r.json()).then((d) => {
      const list = Array.isArray(d) ? d : (d.reports || []);
      setRecentReports(list.slice(0, 5));
    }).catch(() => {});
  }, []);

  function agentName(id: string) { return agents[id] || id; }

  function timeAgo(str: string) {
    if (!str) return "";
    const mins = Math.floor((Date.now() - new Date(str.replace(" ", "T")).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  // Group in-progress tasks by assignee
  const activeAgentMap: Record<string, { name: string; tasks: Task[] }> = {};
  for (const task of inProgressTasks) {
    const key = task.assignee || "unassigned";
    const name = task.assignee ? (agents[task.assignee] || task.assignee) : "Unassigned";
    if (!activeAgentMap[key]) activeAgentMap[key] = { name, tasks: [] };
    activeAgentMap[key].tasks.push(task);
  }
  const activeAgents = Object.values(activeAgentMap);

  const statCards: StatCard[] = [
    { label: "Active Agents", value: stats.agents, icon: Bot },
    { label: "Skills", value: stats.skills, icon: Sparkles },
    { label: "Tools", value: stats.tools, icon: Wrench },
    { label: "Tasks", value: stats.tasks, icon: CheckSquare },
  ];

  const quickActions = [
    { label: "New Task", href: "/tasks", icon: Plus, color: "bg-[#5e6ad2] hover:bg-[#6c78e0] text-white" },
    { label: "New Agent", href: "/factory", icon: Factory, color: "bg-[#111111] hover:bg-[#1a1a1a] text-[#f5f5f5] border border-[#222222] hover:border-[#333333]" },
    { label: "View Reports", href: "/reports", icon: BarChart2, color: "bg-[#111111] hover:bg-[#1a1a1a] text-[#f5f5f5] border border-[#222222] hover:border-[#333333]" },
    { label: "Pipeline", href: "/pipeline", icon: GitBranch, color: "bg-[#111111] hover:bg-[#1a1a1a] text-[#f5f5f5] border border-[#222222] hover:border-[#333333]" },
  ];

  function reportTitle(r: Report): string {
    if (r.title) return r.title;
    return r.filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ").replace(/\.md$/, "");
  }

  function reportType(r: Report): string {
    if (r.type) return r.type;
    const fn = r.filename.toLowerCase();
    if (fn.includes("security") || fn.includes("audit")) return "security";
    if (fn.includes("test") || fn.includes("qa")) return "qa";
    if (fn.includes("report")) return "report";
    return "report";
  }

  const TYPE_COLORS: Record<string, string> = {
    security: "bg-red-500/10 text-red-400",
    qa: "bg-orange-500/10 text-orange-400",
    report: "bg-blue-500/10 text-blue-400",
    analysis: "bg-purple-500/10 text-purple-400",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#555555] mt-0.5">Mission Control Overview</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-md">
          {connected === null ? (
            <><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /><span className="text-xs text-[#888888]">Connecting</span></>
          ) : connected ? (
            <><Wifi className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs text-[#888888]">Gateway online</span></>
          ) : (
            <><WifiOff className="w-3.5 h-3.5 text-red-500" /><span className="text-xs text-[#888888]">Gateway offline</span></>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-[#444444] font-medium mr-1 flex items-center gap-1">
          <Zap className="w-3 h-3" /> Quick Actions
        </span>
        {quickActions.map(({ label, href, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className={clsx("flex items-center gap-1.5 text-xs rounded-md px-3 py-1.5 transition-colors font-medium", color)}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-[#111111] border border-[#222222] rounded-md p-4 hover:bg-[#1a1a1a] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-4 h-4 text-[#555555]" />
              <span className="text-2xl font-semibold text-[#f5f5f5] tabular-nums">{value}</span>
            </div>
            <p className="text-xs text-[#888888]">{label}</p>
          </div>
        ))}
      </div>

      {/* Active Agents + Recent Reports row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Agents Widget */}
        <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222222]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-medium text-[#f5f5f5]">Active Agents</h2>
            <span className="text-[11px] text-[#444444] ml-auto">{activeAgents.length} working</span>
          </div>
          <div>
            {activeAgents.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <Bot className="w-6 h-6 text-[#333333] mx-auto mb-2" />
                <p className="text-[12px] text-[#555555]">No agents currently working</p>
              </div>
            ) : (
              activeAgents.map((agent, idx) => (
                <div key={agent.name} className={clsx("flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors", idx < activeAgents.length - 1 && "border-b border-[#222222]")}>
                  <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#f5f5f5] font-medium">{agent.name}</p>
                    <p className="text-[11px] text-[#555555] truncate">
                      {agent.tasks.length} task{agent.tasks.length !== 1 ? "s" : ""} in progress
                      {agent.tasks[0] && ` — ${agent.tasks[0].title}`}
                    </p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-400 shrink-0">active</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Reports Widget */}
        <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222222]">
            <FileText className="w-4 h-4 text-[#555555]" />
            <h2 className="text-sm font-medium text-[#f5f5f5]">Recent Reports</h2>
            <Link href="/reports" className="text-[11px] text-[#5e6ad2] hover:text-[#6c78e0] ml-auto flex items-center gap-0.5 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            {recentReports.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <FileText className="w-6 h-6 text-[#333333] mx-auto mb-2" />
                <p className="text-[12px] text-[#555555]">No reports yet</p>
              </div>
            ) : (
              recentReports.map((report, idx) => {
                const type = reportType(report);
                return (
                  <Link key={report.filename} href="/reports">
                    <div className={clsx("flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors cursor-pointer", idx < recentReports.length - 1 && "border-b border-[#222222]")}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#f5f5f5] truncate">{reportTitle(report)}</p>
                        <p className="text-[11px] text-[#555555] mt-0.5">{report.created_at ? timeAgo(report.created_at) : report.filename.slice(0, 10)}</p>
                      </div>
                      <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm shrink-0", TYPE_COLORS[type] || TYPE_COLORS.report)}>
                        {type}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222222]">
          <Activity className="w-4 h-4 text-[#555555]" />
          <h2 className="text-sm font-medium text-[#f5f5f5]">Recent Activity</h2>
          <span className="text-[11px] text-[#444444] ml-auto">from database</span>
        </div>
        <div>
          {activities.length === 0 && (
            <div className="px-4 py-8 text-center"><p className="text-[12px] text-[#555555]">No activity yet</p></div>
          )}
          {activities.map((item, idx) => (
            <div key={item.id}
              className={clsx("flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors",
                idx < activities.length - 1 && "border-b border-[#222222]"
              )}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#5e6ad2] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#888888]">
                  <span className="text-[#f5f5f5] font-medium">{agentName(item.agent_id)}</span>
                  {" "}{item.action.replace(/_/g, " ")}
                  {item.detail && <span className="text-[#555555]"> — {item.detail}</span>}
                </p>
              </div>
              <span className="text-[11px] text-[#555555] whitespace-nowrap">{timeAgo(item.created_at)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#555555] mb-3">System</h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555555]">Gateway</span>
              <span className="text-xs text-[#888888] font-mono">127.0.0.1:18789</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555555]">Runtime</span>
              <span className="text-xs text-[#888888] font-mono">Node v22.22.1</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555555]">Database</span>
              <span className="text-xs text-[#888888] font-mono">SQLite (better-sqlite3)</span>
            </div>
          </div>
        </div>
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#555555] mb-3">Quick Links</h3>
          <div className="space-y-2">
            <a href="/agents" className="block text-xs text-[#888888] hover:text-[#5e6ad2] transition-colors">→ Manage Agents</a>
            <a href="/tasks" className="block text-xs text-[#888888] hover:text-[#5e6ad2] transition-colors">→ View Tasks</a>
            <a href="/team" className="block text-xs text-[#888888] hover:text-[#5e6ad2] transition-colors">→ Team Canvas</a>
            <a href="/office" className="block text-xs text-[#888888] hover:text-[#5e6ad2] transition-colors">→ The Office</a>
          </div>
        </div>
      </div>
    </div>
  );
}
