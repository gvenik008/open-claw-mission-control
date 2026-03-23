"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Activity, Users, CheckCircle, Loader2, AlertTriangle, TrendingUp, Zap, Clock } from "lucide-react";

interface Metrics {
  summary: {
    totalAgents: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
  };
  dailyActivity: { day: string; count: number }[];
  agentActivity: { agent_id: string; agent_name: string; count: number; last_active: string }[];
  agentTasks: { assignee: string; total: number; completed: number }[];
  activityTypes: { action: string; count: number }[];
  recentIssues: { id: string; agent_id: string; action: string; detail: string; created_at: string }[];
}

function formatRelative(ts: string): string {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const ACTIVITY_COLORS = [
  "bg-[#5e6ad2]", "bg-blue-500", "bg-emerald-500", "bg-orange-500",
  "bg-purple-500", "bg-pink-500", "bg-yellow-500", "bg-cyan-500",
];

export default function RadarPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/metrics");
      const data = await res.json();
      setMetrics(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const summary = metrics?.summary;
  const completionRate = summary && summary.totalTasks > 0
    ? Math.round((summary.completedTasks / summary.totalTasks) * 100)
    : 0;

  const maxDayCount = Math.max(...(metrics?.dailyActivity?.map((d) => d.count) ?? [1]), 1);
  const totalActivityTypes = metrics?.activityTypes?.reduce((s, a) => s + a.count, 0) || 1;

  return (
    <div className="p-6 min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Monitoring</h1>
          <p className="text-sm text-[#555555] mt-0.5">System health and agent performance metrics</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-md text-[13px] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Active Agents",
            value: summary?.totalAgents ?? "—",
            icon: Users,
            color: "text-[#5e6ad2]",
            sub: "agents running",
          },
          {
            label: "Tasks Completed",
            value: summary?.completedTasks ?? "—",
            icon: CheckCircle,
            color: "text-emerald-400",
            sub: `of ${summary?.totalTasks ?? 0} total`,
          },
          {
            label: "Completion Rate",
            value: `${completionRate}%`,
            icon: TrendingUp,
            color: completionRate >= 70 ? "text-emerald-400" : completionRate >= 40 ? "text-yellow-400" : "text-red-400",
            sub: "success rate",
          },
          {
            label: "In Progress",
            value: summary?.inProgressTasks ?? "—",
            icon: Loader2,
            color: "text-blue-400",
            sub: `${summary?.pendingTasks ?? 0} pending`,
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#111111] border border-[#222222] rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-[#555555]">{stat.label}</span>
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            </div>
            <div className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</div>
            <div className="text-[11px] text-[#444444] mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Daily Activity Chart */}
        <div className="col-span-2 bg-[#111111] border border-[#222222] rounded-md p-4">
          <h2 className="text-[13px] font-medium text-[#f5f5f5] mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#5e6ad2]" />
            Daily Activity (Last 7 Days)
          </h2>
          {!metrics?.dailyActivity?.length ? (
            <div className="flex items-center justify-center h-32 text-[13px] text-[#555555]">No activity data</div>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {metrics.dailyActivity.map((day, i) => {
                const height = Math.max((day.count / maxDayCount) * 100, 4);
                const dayLabel = new Date(day.day + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
                return (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full">
                      <div
                        className="w-full bg-[#5e6ad2] rounded-t-sm transition-all group-hover:bg-[#7b85e0]"
                        style={{ height: `${height}%`, minHeight: "4px", maxHeight: "120px" }}
                        title={`${day.count} activities on ${dayLabel}`}
                      />
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-[#5e6ad2] opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                        {day.count}
                      </div>
                    </div>
                    <span className="text-[9px] text-[#444444] whitespace-nowrap">{dayLabel.split("/").slice(0, 2).join("/")}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity breakdown */}
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
          <h2 className="text-[13px] font-medium text-[#f5f5f5] mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#5e6ad2]" />
            Activity Types
          </h2>
          {!metrics?.activityTypes?.length ? (
            <div className="text-center text-[13px] text-[#555555] py-8">No data</div>
          ) : (
            <div className="space-y-2">
              {metrics.activityTypes.slice(0, 8).map((type, i) => {
                const pct = Math.round((type.count / totalActivityTypes) * 100);
                return (
                  <div key={type.action}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-[#888888] truncate max-w-[140px]">{formatAction(type.action)}</span>
                      <span className="text-[#555555] shrink-0 ml-2">{type.count}</span>
                    </div>
                    <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${ACTIVITY_COLORS[i % ACTIVITY_COLORS.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Agent performance table */}
      <div className="bg-[#111111] border border-[#222222] rounded-md mb-6">
        <div className="px-4 py-3 border-b border-[#222222]">
          <h2 className="text-[13px] font-medium text-[#f5f5f5] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#5e6ad2]" />
            Agent Performance
          </h2>
        </div>
        {!metrics?.agentActivity?.length ? (
          <div className="p-6 text-center text-[13px] text-[#555555]">No agent activity data</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-[#555555]">Agent</th>
                <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-[#555555]">Activities</th>
                <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-[#555555]">Tasks Done</th>
                <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-[#555555]">Last Active</th>
                <th className="text-center px-4 py-2 text-[10px] uppercase tracking-wider text-[#555555]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {metrics.agentActivity.map((agent) => {
                const taskInfo = metrics.agentTasks?.find((t) => t.assignee === agent.agent_id);
                const isRecent = agent.last_active && (Date.now() - new Date(agent.last_active).getTime()) < 3600000;
                return (
                  <tr key={agent.agent_id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-[13px] text-[#f5f5f5]">{agent.agent_name || agent.agent_id}</div>
                      <div className="text-[10px] text-[#444444] font-mono">{agent.agent_id}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] text-[#888888]">{agent.count}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-[#888888]">
                      {taskInfo ? `${taskInfo.completed}/${taskInfo.total}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] text-[#555555] flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelative(agent.last_active)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                        isRecent ? "bg-emerald-500/10 text-emerald-400" : "bg-[#1a1a1a] text-[#555555]"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isRecent ? "bg-emerald-400" : "bg-[#444444]"}`} />
                        {isRecent ? "Active" : "Idle"}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent issues */}
      <div className="bg-[#111111] border border-[#222222] rounded-md">
        <div className="px-4 py-3 border-b border-[#222222]">
          <h2 className="text-[13px] font-medium text-[#f5f5f5] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            Recent Issues & Errors
          </h2>
        </div>
        {!metrics?.recentIssues?.length ? (
          <div className="p-6 text-center">
            <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-[13px] text-emerald-400">No recent errors or timeouts</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {metrics.recentIssues.map((issue) => (
              <div key={issue.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#f5f5f5]">{formatAction(issue.action)}</span>
                    <span className="text-[11px] text-[#555555]">{issue.agent_id}</span>
                  </div>
                  {issue.detail && <p className="text-[11px] text-[#555555] truncate mt-0.5">{issue.detail}</p>}
                </div>
                <span className="text-[11px] text-[#444444] shrink-0">{formatRelative(issue.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
