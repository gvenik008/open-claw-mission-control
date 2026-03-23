"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Radio, Clock, CheckCircle, AlertTriangle, XCircle, Activity, User, Zap } from "lucide-react";

interface Session {
  id: string;
  agent_id: string;
  status: string;
  model: string;
  started_at: string;
  ended_at: string | null;
  token_count: number;
  summary: string;
}

interface RecentRun {
  agent_id: string;
  action: string;
  detail: string;
  created_at: string;
}

function formatDuration(start: string, end: string | null): string {
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  const diff = Math.floor((endMs - startMs) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatRelative(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  active: { label: "Running", color: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400 animate-pulse" },
  running: { label: "Running", color: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400 animate-pulse" },
  done: { label: "Done", color: "bg-blue-500/10 text-blue-400", dot: "bg-blue-400" },
  completed: { label: "Done", color: "bg-blue-500/10 text-blue-400", dot: "bg-blue-400" },
  timeout: { label: "Timeout", color: "bg-orange-500/10 text-orange-400", dot: "bg-orange-400" },
  error: { label: "Error", color: "bg-red-500/10 text-red-400", dot: "bg-red-400" },
  failed: { label: "Error", color: "bg-red-500/10 text-red-400", dot: "bg-red-400" },
};

const ACTION_LABELS: Record<string, string> = {
  task_started: "Task Started",
  task_completed: "Task Completed",
  agent_trained: "Agent Trained",
  agent_deployed: "Agent Deployed",
  skills_auto_assigned: "Skills Assigned",
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "recent">("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(data.sessions || []);
      setRecentRuns(data.recentRuns || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const activeSessions = sessions.filter((s) => s.status === "active" || s.status === "running");
  const recentSessions = sessions.filter((s) => s.status !== "active" && s.status !== "running");
  const displayed = tab === "active" ? activeSessions : recentSessions;

  const statusCfg = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG["done"];

  return (
    <div className="p-6 min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Sessions</h1>
          <p className="text-sm text-[#555555] mt-0.5">Live agent session monitoring and history</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-md text-[13px] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Active", value: activeSessions.length, icon: Radio, color: "text-emerald-400" },
          { label: "Total Sessions", value: sessions.length, icon: Activity, color: "text-blue-400" },
          { label: "Completed", value: recentSessions.filter((s) => s.status === "done" || s.status === "completed").length, icon: CheckCircle, color: "text-[#5e6ad2]" },
          { label: "Recent Events", value: recentRuns.length, icon: Zap, color: "text-orange-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#111111] border border-[#222222] rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-[#555555]">{stat.label}</span>
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-semibold text-[#f5f5f5]">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#111111] border border-[#222222] rounded-md p-1 w-fit">
        {(["active", "recent"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-[13px] transition-colors capitalize ${
              tab === t ? "bg-[#5e6ad2] text-white" : "text-[#888888] hover:text-[#f5f5f5]"
            }`}
          >
            {t === "active" ? `Active (${activeSessions.length})` : `Recent (${recentSessions.length})`}
          </button>
        ))}
      </div>

      {/* Sessions list */}
      <div className="space-y-2 mb-8">
        {displayed.length === 0 ? (
          <div className="bg-[#111111] border border-[#222222] rounded-md p-8 text-center">
            <Radio className="w-8 h-8 text-[#444444] mx-auto mb-3" />
            <p className="text-[13px] text-[#555555]">
              {tab === "active" ? "No active sessions right now" : "No recent sessions found"}
            </p>
          </div>
        ) : (
          displayed.map((session) => {
            const cfg = statusCfg(session.status);
            const isExpanded = expandedId === session.id;
            return (
              <div
                key={session.id}
                className="bg-[#111111] border border-[#222222] rounded-md hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
              >
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-medium text-[#f5f5f5]">{session.agent_id}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-[11px] text-[#555555] truncate">{session.summary || "No summary available"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-[11px] text-[#555555] justify-end">
                      <Clock className="w-3 h-3" />
                      {formatDuration(session.started_at, session.ended_at)}
                    </div>
                    <div className="text-[11px] text-[#444444] mt-0.5">{formatTime(session.started_at)}</div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-[#222222] px-4 py-3 space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-[12px]">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#555555]">Session ID</span>
                        <p className="text-[#888888] font-mono mt-0.5">{session.id}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#555555]">Model</span>
                        <p className="text-[#888888] mt-0.5">{session.model || "—"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#555555]">Started</span>
                        <p className="text-[#888888] mt-0.5">{new Date(session.started_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#555555]">Tokens</span>
                        <p className="text-[#888888] mt-0.5">{session.token_count.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Activity Timeline */}
      <div>
        <h2 className="text-[13px] font-medium text-[#f5f5f5] mb-3">Recent Agent Activity</h2>
        <div className="bg-[#111111] border border-[#222222] rounded-md divide-y divide-[#1a1a1a]">
          {recentRuns.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-[#555555]">No recent activity</div>
          ) : (
            recentRuns.map((run, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-[#5e6ad2] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#f5f5f5]">{ACTION_LABELS[run.action] || run.action}</span>
                    <span className="text-[11px] text-[#555555]">by {run.agent_id}</span>
                  </div>
                  {run.detail && <p className="text-[11px] text-[#555555] truncate mt-0.5">{run.detail}</p>}
                </div>
                <span className="text-[11px] text-[#444444] shrink-0">{formatRelative(run.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
