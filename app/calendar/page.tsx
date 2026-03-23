"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Calendar, Clock, CheckCircle, AlertCircle, Terminal, Plus, X, Loader2, Trash2, Edit2, ToggleLeft, ToggleRight } from "lucide-react";

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

interface OldCronJob {
  id: number;
  raw: string;
  note: string;
}

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  agent_id: string | null;
  task_description: string;
  enabled: number | boolean;
  last_run: string | null;
  next_run: string | null;
  created_at: string;
  updated_at: string;
}

interface Agent {
  agent_id: string;
  name: string;
  status: string;
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
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

function cronDescription(schedule: string): string {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return schedule;
  const [min, hour, dom, month, dow] = parts;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (min === "0" && hour !== "*" && dom === "*" && month === "*" && dow === "*") {
    return `Daily at ${hour}:00`;
  }
  if (min !== "*" && hour !== "*" && dom === "*" && month === "*" && dow !== "*") {
    const dayNames = dow.split(",").map((d) => days[parseInt(d)] || d).join(", ");
    return `Weekly on ${dayNames} at ${hour}:${min.padStart(2, "0")}`;
  }
  if (min !== "*" && hour !== "*" && dom !== "*" && month === "*" && dow === "*") {
    return `Monthly on day ${dom} at ${hour}:${min.padStart(2, "0")}`;
  }
  if (schedule === "* * * * *") return "Every minute";
  if (schedule === "0 * * * *") return "Every hour";
  return schedule;
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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"week" | "upcoming" | "cron">("upcoming");

  // Cron modal state
  const [showCronModal, setShowCronModal] = useState(false);
  const [editingCron, setEditingCron] = useState<CronJob | null>(null);
  const [cronForm, setCronForm] = useState({ name: "", schedule: "", agentId: "", taskDescription: "" });
  const [savingCron, setSavingCron] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [calRes, cronRes, agentsRes] = await Promise.all([
        fetch("/api/calendar"),
        fetch("/api/cron"),
        fetch("/api/deploy-agent"),
      ]);
      const data = await calRes.json();
      const cronData = await cronRes.json();
      const agentsData = await agentsRes.json();
      setScheduledTasks(data.scheduledTasks || []);
      setRecentTasks(data.recentTasks || []);
      setCronJobs(Array.isArray(cronData) ? cronData : []);
      setAgents(Array.isArray(agentsData) ? agentsData.filter((a: Agent) => a.status === "active") : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const weekDays = getWeekDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasksByDate: Record<string, Task[]> = {};
  for (const task of scheduledTasks) {
    if (!task.due_date) continue;
    const key = new Date(task.due_date).toISOString().split("T")[0];
    if (!tasksByDate[key]) tasksByDate[key] = [];
    tasksByDate[key].push(task);
  }

  const upcoming = scheduledTasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date).getTime();
    const now = Date.now();
    return d >= now - 86400000 && d <= now + 7 * 86400000;
  });

  function openAddCron() {
    setEditingCron(null);
    setCronForm({ name: "", schedule: "", agentId: "", taskDescription: "" });
    setShowCronModal(true);
  }

  function openEditCron(job: CronJob) {
    setEditingCron(job);
    setCronForm({
      name: job.name,
      schedule: job.schedule,
      agentId: job.agent_id || "",
      taskDescription: job.task_description || "",
    });
    setShowCronModal(true);
  }

  function closeCronModal() {
    setShowCronModal(false);
    setEditingCron(null);
    setCronForm({ name: "", schedule: "", agentId: "", taskDescription: "" });
  }

  async function handleSaveCron() {
    if (!cronForm.name || !cronForm.schedule) return;
    setSavingCron(true);
    try {
      if (editingCron) {
        await fetch("/api/cron", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCron.id,
            name: cronForm.name,
            schedule: cronForm.schedule,
            agentId: cronForm.agentId || null,
            taskDescription: cronForm.taskDescription,
          }),
        });
      } else {
        await fetch("/api/cron", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cronForm.name,
            schedule: cronForm.schedule,
            agentId: cronForm.agentId || null,
            taskDescription: cronForm.taskDescription,
          }),
        });
      }
      closeCronModal();
      await load();
    } catch {}
    setSavingCron(false);
  }

  async function handleToggleCron(job: CronJob) {
    const enabled = job.enabled === 1 || job.enabled === true;
    await fetch("/api/cron", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: job.id, enabled: !enabled }),
    });
    await load();
  }

  async function handleDeleteCron(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setDeletingId(id);
    try {
      await fetch("/api/cron", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setConfirmDeleteId(null);
      await load();
    } catch {}
    setDeletingId(null);
  }

  function agentName(agentId: string | null): string {
    if (!agentId) return "—";
    const a = agents.find((ag) => ag.agent_id === agentId);
    return a?.name || agentId;
  }

  return (
    <div className="p-6 min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Calendar</h1>
          <p className="text-sm text-[#555555] mt-0.5">Scheduled tasks and cron jobs</p>
        </div>
        <div className="flex items-center gap-2">
          {view === "cron" && (
            <button
              onClick={openAddCron}
              className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Cron Job
            </button>
          )}
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-md text-[13px] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
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
        <div className="space-y-3">
          {cronJobs.length === 0 ? (
            <div className="bg-[#111111] border border-[#222222] rounded-md p-8 text-center">
              <Terminal className="w-8 h-8 text-[#444444] mx-auto mb-3" />
              <p className="text-[13px] text-[#555555]">No cron jobs yet</p>
              <p className="text-[11px] text-[#444444] mt-1 mb-4">Schedule recurring tasks for your agents</p>
              <button
                onClick={openAddCron}
                className="inline-flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Cron Job
              </button>
            </div>
          ) : (
            <div className="bg-[#111111] border border-[#222222] rounded-md divide-y divide-[#222222]">
              {cronJobs.map((job) => {
                const isEnabled = job.enabled === 1 || job.enabled === true;
                const isConfirmDelete = confirmDeleteId === job.id;
                return (
                  <div key={job.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isEnabled ? "bg-emerald-500" : "bg-[#444444]"}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] text-[#f5f5f5] font-medium">{job.name}</span>
                        {!isEnabled && <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#555555]">disabled</span>}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#555555]">
                        <span title={cronDescription(job.schedule)} className="font-mono cursor-help text-[#888888]">{job.schedule}</span>
                        <span className="text-[#444444]">→ {cronDescription(job.schedule)}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[#444444]">
                        <span>Agent: {agentName(job.agent_id)}</span>
                        {job.last_run && <span>Last: {formatRelative(job.last_run)}</span>}
                        {job.task_description && <span className="truncate max-w-[200px]">{job.task_description}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggleCron(job)}
                        className="text-[#555555] hover:text-[#f5f5f5] transition-colors"
                        title={isEnabled ? "Disable" : "Enable"}
                      >
                        {isEnabled
                          ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                          : <ToggleLeft className="w-4 h-4" />
                        }
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => openEditCron(job)}
                        className="text-[#555555] hover:text-[#888888] transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteCron(job.id)}
                        disabled={deletingId === job.id}
                        className={`transition-colors text-[11px] flex items-center gap-1 ${
                          isConfirmDelete ? "text-red-400 hover:text-red-300" : "text-[#555555] hover:text-red-400"
                        }`}
                        title={isConfirmDelete ? "Click again to confirm" : "Delete"}
                      >
                        {deletingId === job.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                        {isConfirmDelete && <span>Confirm?</span>}
                      </button>
                      {isConfirmDelete && (
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[11px] text-[#555555] hover:text-[#888888]"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Cron Modal */}
      {showCronModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) closeCronModal(); }}
        >
          <div className="bg-[#111111] border border-[#222222] rounded-md w-full max-w-md mx-4 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#f5f5f5]">
                {editingCron ? "Edit Cron Job" : "Add Cron Job"}
              </h2>
              <button onClick={closeCronModal} className="text-[#555555] hover:text-[#888888]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Name *</label>
                <input
                  autoFocus
                  value={cronForm.name}
                  onChange={(e) => setCronForm({ ...cronForm, name: e.target.value })}
                  placeholder="e.g. Daily Report"
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Schedule *</label>
                <input
                  value={cronForm.schedule}
                  onChange={(e) => setCronForm({ ...cronForm, schedule: e.target.value })}
                  placeholder="0 10 * * 1"
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2] font-mono"
                />
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-[10px] text-[#444444]">Format: minute hour day-of-month month day-of-week</p>
                  {cronForm.schedule && (
                    <p className="text-[11px] text-[#5e6ad2]">→ {cronDescription(cronForm.schedule)}</p>
                  )}
                  <div className="flex gap-3 mt-1">
                    {[["0 9 * * *", "Daily 9am"], ["0 10 * * 1", "Mon 10am"], ["0 * * * *", "Hourly"]].map(([val, label]) => (
                      <button key={val} onClick={() => setCronForm({ ...cronForm, schedule: val })}
                        className="text-[10px] text-[#555555] hover:text-[#5e6ad2] transition-colors">
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Agent</label>
                <select
                  value={cronForm.agentId}
                  onChange={(e) => setCronForm({ ...cronForm, agentId: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]"
                >
                  <option value="">No agent</option>
                  {agents.map((a) => (
                    <option key={a.agent_id} value={a.agent_id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Task Description</label>
                <textarea
                  value={cronForm.taskDescription}
                  onChange={(e) => setCronForm({ ...cronForm, taskDescription: e.target.value })}
                  placeholder="What should the agent do when this triggers?"
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={closeCronModal}
                className="bg-[#222222] hover:bg-[#2a2a2a] text-[#ccc] text-xs rounded-md px-3 py-1.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCron}
                disabled={savingCron || !cronForm.name.trim() || !cronForm.schedule.trim()}
                className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium disabled:opacity-50"
              >
                {savingCron && <Loader2 className="w-3 h-3 animate-spin" />}
                {editingCron ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
