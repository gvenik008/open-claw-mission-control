"use client";

import { useEffect, useState } from "react";
import { Activity, Bot, Wrench, CheckSquare, Sparkles, Wifi, WifiOff } from "lucide-react";
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

export default function Dashboard() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ agents: 0, skills: 0, tools: 0, tasks: 0 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [agents, setAgents] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check gateway
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
    fetch("/api/tasks").then((r) => r.json()).then((d) => setStats((s) => ({ ...s, tasks: d.length }))).catch(() => {});

    // Load activities
    fetch("/api/activities?limit=10").then((r) => r.json()).then(setActivities).catch(() => {});
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

  const statCards: StatCard[] = [
    { label: "Active Agents", value: stats.agents, icon: Bot },
    { label: "Skills", value: stats.skills, icon: Sparkles },
    { label: "Tools", value: stats.tools, icon: Wrench },
    { label: "Tasks", value: stats.tasks, icon: CheckSquare },
  ];

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
