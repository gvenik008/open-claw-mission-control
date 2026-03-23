"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Calendar, Clock, CheckCircle, AlertCircle, Terminal, ChevronRight } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

interface CronJob {
  id: number;
  raw: string;
  note: string;
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 0) {
    const future = Math.abs(diff);
    if (future < 3600) return `in ${Math.floor(future / 60)}m`;
    if (future < 86400) return `in ${Math.floor(future / 3600)}h`;
    return `in ${Math.floor(future / 86400)}d`;
  }
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getWeekDays(): Date[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-400 border-l-2 border-red-400",
  high: "bg-orange-500/10 text-orange-400 border-l-2 border-orange-400",
  medium: "bg-blue-500/10 text-blue-400 border-l-2 border-blue-400",
  low: "bg-[#1a1a1a] text-[#888888] border-l-2 border-[#333333]",
};

const STATUS_COLORS: Record<string, string> = {
  done: "text-emerald-400",
  in_progress: "text-blue-400",
  pending: "text-orange-400",
  review: "text-purple-400",
};

export default function CalendarPage() {
  const [scheduledTasks, setScheduledTasks] = useState<Task[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"week" | "upcoming" | "cron">("upcoming");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar");
      const data = await res.json();
      setScheduledTasks(data.scheduledTasks || []);
      setRecentTasks(data.recentTasks || []);
      setCronJobs(data.cronJobs || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const weekDays = getWeekDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group tasks by date for week view
  const tasksByDate: Record<string, Task[]> = {};
  for (const task of scheduledTasks) {
    if (!task.due_date) continue;
    const key = new Date(task.due_date).toISOString().split("T")[0];
    if (!tasksByDate[key]) tasksByDate[key] = [];
    tasksByDate[key].push(task);
  }

  // Upcoming tasks (next 7 days)
  const upcoming = scheduledTasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date).getTime();
    const now = Date.now();
    return d >= now - 86400000 && d <= now + 7 * 86400000;
  });

  return (
    <div className="p-6 min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Calendar</h1>
          <p className="text-sm text-[#555555] mt-0.5">Scheduled tasks and cron jobs</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-md text-[13px] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Scheduled", value: scheduledTasks.length, color: "text-blue-400" },
          { label: "Upcoming (7d)", value: upcoming.length, color: "text-emerald-400" },
          { label: "Cron Jobs", value: cronJobs.length, color: "text-purple-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#111111] border border-[#222222] rounded-md p-4">
            <div className="text-[10px] uppercase tracking-wider text-[#555555] mb-2">{stat.label}</div>
            <div className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#111111] border border-[#222222] rounded-md p-1 w-fit">
        {(["upcoming", "week", "cron"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded text-[13px] transition-colors capitalize ${
              view === v ? "bg-[#5e6ad2] text-white" : "text-[#888888] hover:text-[#f5f5f5]"
            }`}
          >
            {v === "week" ? "Week View" : v === "upcoming" ? "Upcoming" : "Cron Jobs"}
          </button>
        ))}
      </div>

      {/* Upcoming view */}
      {view === "upcoming" && (
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <div className="bg-[#111111] border border-[#222222] rounded-md p-8 text-center">
              <Calendar className="w-8 h-8 text-[#444444] mx-auto mb-3" />
              <p className="text-[13px] text-[#555555]">No upcoming scheduled tasks in the next 7 days</p>
            </div>
          ) : (
            upcoming.map((task) => (
              <div key={task.id} className={`rounded-md p-4 pl-4 ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-medium text-[#f5f5f5]">{task.title}</span>
                      <span className={`text-[10px] ${STATUS_COLORS[task.status] || "text-[#888888]"}`}>{task.status}</span>
                    </div>
                    {task.description && (
                      <p className="text-[12px] text-[#555555] truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      {task.assignee && (
                        <span className="text-[11px] text-[#555555]">→ {task.assignee}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-[12px] text-[#888888]">
                      <Clock className="w-3 h-3" />
                      {formatDate(task.due_date!)}
                    </div>
                    <div className="text-[11px] text-[#555555] mt-0.5">{formatRelative(task.due_date!)}</div>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Recent task activity */}
          <div className="mt-8">
            <h2 className="text-[13px] font-medium text-[#f5f5f5] mb-3">Recent Task Activity</h2>
            <div className="bg-[#111111] border border-[#222222] rounded-md divide-y divide-[#1a1a1a]">
              {recentTasks.length === 0 ? (
                <div className="p-6 text-center text-[13px] text-[#555555]">No recent tasks</div>
              ) : (
                recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                    {task.status === "done" ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    )}
                    <span className="text-[13px] text-[#f5f5f5] flex-1 truncate">{task.title}</span>
                    <span className={`text-[10px] ${STATUS_COLORS[task.status] || "text-[#888888]"}`}>{task.status}</span>
                    <span className="text-[11px] text-[#444444] shrink-0">{formatRelative(task.updated_at)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Week view */}
      {view === "week" && (
        <div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const key = day.toISOString().split("T")[0];
              const dayTasks = tasksByDate[key] || [];
              const isToday = day.getTime() === today.getTime();
              return (
                <div
                  key={key}
                  className={`bg-[#111111] border rounded-md p-3 min-h-[120px] ${
                    isToday ? "border-[#5e6ad2]/50" : "border-[#222222]"
                  }`}
                >
                  <div className={`text-[11px] font-medium mb-2 ${isToday ? "text-[#5e6ad2]" : "text-[#555555]"}`}>
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                    <span className={`block text-[16px] font-semibold ${isToday ? "text-[#5e6ad2]" : "text-[#f5f5f5]"}`}>
                      {day.getDate()}
                    </span>
                  </div>
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded mb-1 truncate"
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cron view */}
      {view === "cron" && (
        <div>
          <div className="bg-[#111111] border border-[#222222] rounded-md">
            {cronJobs.length === 0 ? (
              <div className="p-8 text-center">
                <Terminal className="w-8 h-8 text-[#444444] mx-auto mb-3" />
                <p className="text-[13px] text-[#555555]">No cron jobs found</p>
                <p className="text-[11px] text-[#444444] mt-1">Cron jobs are managed via OpenClaw gateway config</p>
              </div>
            ) : (
              cronJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-4 px-4 py-3 border-b border-[#1a1a1a] last:border-0 hover:bg-[#1a1a1a] transition-colors">
                  <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] text-[#f5f5f5] font-mono">{job.raw}</span>
                    {job.note && <p className="text-[11px] text-[#555555] mt-0.5">{job.note}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 p-4 bg-[#111111] border border-[#222222] rounded-md">
            <p className="text-[12px] text-[#555555]">
              <span className="text-[#888888] font-medium">Note:</span> Cron jobs are configured in the OpenClaw gateway
              config file at <code className="text-[#5e6ad2] bg-[#5e6ad2]/10 px-1 rounded">~/.openclaw/config.yaml</code>.
              Use the OpenClaw CLI to manage scheduled tasks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
