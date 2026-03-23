"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Plus, X, Loader2, RefreshCw, Trash2, Save, ChevronDown } from "lucide-react";
import clsx from "clsx";

type Priority = "urgent" | "high" | "medium" | "low";
type Status = "pending" | "in_progress" | "review" | "done" | "cancelled";

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string | null;
  priority: Priority;
  status: Status;
  tags: string[];
  result?: string;
  created_by: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Agent {
  agent_id: string;
  name: string;
  status: string;
}

interface ActivityItem {
  id: string;
  agent_id: string;
  action: string;
  detail: string;
  created_at: string;
}

interface TaskProgress {
  id: string;
  title: string;
  assignee: string;
  agentName: string;
  priority: string;
  startedAt: string;
  timeoutSeconds: number;
  elapsedSeconds: number;
  progressPercent: number;
  status: "running" | "near_complete" | "overtime";
  estimatedRemaining: string;
}

const COLUMNS: { key: Status; label: string }[] = [
  { key: "pending", label: "Backlog" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];
const STATUSES: Status[] = ["pending", "in_progress", "review", "done", "cancelled"];

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: "bg-red-500/10 text-red-400",
  high: "bg-orange-500/10 text-orange-400",
  medium: "bg-yellow-500/10 text-yellow-400",
  low: "bg-[#222222] text-[#888888]",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: "P0",
  high: "P1",
  medium: "P2",
  low: "P3",
};

function formatDate(str: string) {
  if (!str) return "";
  const d = new Date(str.replace(" ", "T"));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateFull(str: string) {
  if (!str) return "";
  const d = new Date(str.replace(" ", "T"));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(str: string) {
  if (!str) return "";
  const now = Date.now();
  const then = new Date(str.replace(" ", "T")).getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignee: "",
    priority: "medium" as Priority,
  });

  // Progress tracking for in_progress tasks
  const [progress, setProgress] = useState<Record<string, TaskProgress>>({});
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Task detail modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<Partial<Task>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dragOverCol = useRef<Status | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [tasksRes, agentsRes, actRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/deploy-agent"),
        fetch("/api/activities?limit=15"),
      ]);
      const tasksData = await tasksRes.json();
      const agentsData = await agentsRes.json();
      const actData = await actRes.json();
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setAgents(Array.isArray(agentsData) ? agentsData.filter((a: Agent) => a.status === "active") : []);
      setActivities(Array.isArray(actData) ? actData : []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Poll /api/task-progress every 5s, but only when there are in_progress tasks
  useEffect(() => {
    const hasInProgress = tasks.some((t) => t.status === "in_progress");

    if (hasInProgress) {
      const fetchProgress = async () => {
        try {
          const res = await fetch("/api/task-progress");
          if (!res.ok) return;
          const data = await res.json();
          const map: Record<string, TaskProgress> = {};
          if (Array.isArray(data.tasks)) {
            for (const tp of data.tasks) map[tp.id] = tp;
          }
          setProgress(map);
        } catch {
          // silently fail
        }
      };
      fetchProgress();
      progressIntervalRef.current = setInterval(fetchProgress, 5000);
    } else {
      setProgress({});
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [tasks]);

  // Escape key to dismiss detail modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedTask) {
          setSelectedTask(null);
          setEditForm({});
          setConfirmDelete(false);
        } else if (showModal) {
          setShowModal(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedTask, showModal]);

  function agentName(agentId: string | null): string {
    if (!agentId) return "Unassigned";
    const agent = agents.find((a) => a.agent_id === agentId);
    return agent?.name || agentId;
  }

  function openTaskDetail(task: Task) {
    setSelectedTask(task);
    setEditForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
    });
    setConfirmDelete(false);
  }

  function closeTaskDetail() {
    setSelectedTask(null);
    setEditForm({});
    setConfirmDelete(false);
  }

  async function handleSaveTask() {
    if (!selectedTask) return;
    setSaving(true);
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTask.id, ...editForm }),
      });
      await loadData();
      // Update selected task with new data
      const updated = tasks.find((t) => t.id === selectedTask.id);
      if (updated) setSelectedTask({ ...updated, ...editForm } as Task);
    } catch {}
    setSaving(false);
  }

  async function handleDeleteTask() {
    if (!selectedTask) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTask.id }),
      });
      closeTaskDetail();
      await loadData();
    } catch {}
    setDeleting(false);
  }

  async function handleCreate() {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          assignee: form.assignee || null,
          priority: form.priority,
        }),
      });
      setForm({ title: "", description: "", assignee: "", priority: "medium" });
      setShowModal(false);
      await loadData();
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  }

  async function updateTaskStatus(taskId: string, newStatus: Status) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status: newStatus }),
    });
    await loadData();
  }

  function onDragStart(id: string) {
    setDragging(id);
  }

  function onDragOver(e: React.DragEvent, col: Status) {
    e.preventDefault();
    dragOverCol.current = col;
  }

  function onDrop(col: Status) {
    if (!dragging) return;
    const task = tasks.find((t) => t.id === dragging);
    if (task && task.status !== col) {
      updateTaskStatus(dragging, col);
    }
    setDragging(null);
    dragOverCol.current = null;
  }

  const byColumn = (status: Status) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => {
        const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return pOrder[a.priority] - pOrder[b.priority];
      });

  return (
    <div className="flex gap-4 h-full">
      {/* Main board */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Tasks</h1>
            <p className="text-sm text-[#555555] mt-0.5">
              {loading ? "Loading…" : `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setLoading(true); loadData(); }}
              className="flex items-center gap-1.5 text-[#555555] hover:text-[#888888] text-xs px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors"
            >
              <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              New Task
            </button>
          </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-4 gap-3">
          {COLUMNS.map(({ key, label }) => {
            const colTasks = byColumn(key);
            return (
              <div
                key={key}
                className="flex flex-col gap-2 min-h-48"
                onDragOver={(e) => onDragOver(e, key)}
                onDrop={() => onDrop(key)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-0 py-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#555555] font-medium">
                    {label}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888]">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                {colTasks.map((task) => {
                  const taskProgress = key === "in_progress" ? progress[task.id] : undefined;
                  const progressColor = taskProgress
                    ? taskProgress.status === "overtime"
                      ? "#ef4444"
                      : taskProgress.status === "near_complete"
                      ? "#f59e0b"
                      : "#5e6ad2"
                    : "#5e6ad2";

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => onDragStart(task.id)}
                      onClick={() => openTaskDetail(task)}
                      className={clsx(
                        "bg-[#111111] rounded-md px-3 py-2.5 cursor-pointer hover:bg-[#1a1a1a] transition-colors duration-150",
                        dragging === task.id && "opacity-50",
                        taskProgress
                          ? "border border-[#5e6ad2]/40 shadow-[0_0_8px_rgba(94,106,210,0.08)]"
                          : "border border-[#222222] hover:border-[#333333]"
                      )}
                    >
                      <p className="text-[13px] text-[#f5f5f5] leading-snug mb-2">{task.title}</p>
                      {task.description && (
                        <p className="text-[11px] text-[#555555] leading-snug mb-2 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={clsx(
                            "text-[10px] px-1.5 py-0.5 rounded-sm font-medium",
                            PRIORITY_COLORS[task.priority]
                          )}
                        >
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888] truncate max-w-[100px]">
                          {agentName(task.assignee)}
                        </span>
                      </div>
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {task.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] px-1 py-0.5 rounded-sm bg-[#5e6ad2]/10 text-[#5e6ad2]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-[#444444] mt-1.5">{formatDate(task.created_at)}</p>

                      {/* Progress bar — only shown for in_progress tasks with live data */}
                      {taskProgress && (
                        <div className="mt-2 pt-2 border-t border-[#1a1a1a]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-[#555555]">{taskProgress.estimatedRemaining} left</span>
                            <span className="text-[10px]" style={{ color: progressColor }}>{taskProgress.progressPercent}%</span>
                          </div>
                          <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-linear"
                              style={{ width: `${taskProgress.progressPercent}%`, backgroundColor: progressColor }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Drop zone placeholder */}
                {colTasks.length === 0 && (
                  <div className="border border-dashed border-[#2a2a2a] rounded-md h-16 flex items-center justify-center">
                    <span className="text-[11px] text-[#555555]">
                      {loading ? "Loading…" : "Drop here"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity feed */}
      <div className="w-56 shrink-0">
        <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[#222222] flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium">Activity</p>
            <span className="text-[10px] text-[#444444]">{activities.length}</span>
          </div>
          <div className="divide-y divide-[#222222] max-h-[500px] overflow-y-auto">
            {activities.length === 0 && (
              <div className="px-3 py-4 text-center">
                <p className="text-[11px] text-[#555555]">No activity yet</p>
              </div>
            )}
            {activities.map((item) => (
              <div key={item.id} className="px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors duration-150">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-medium text-[#888888]">
                    {agentName(item.agent_id)}
                  </span>
                  <span className="text-[9px] text-[#444444]">· {item.action.replace(/_/g, " ")}</span>
                </div>
                <p className="text-[11px] text-[#888888] leading-snug">{item.detail}</p>
                <p className="text-[9px] text-[#444444] mt-0.5">{timeAgo(item.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#111111] border border-[#222222] rounded-md w-96 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#f5f5f5]">New Task</h2>
              <button onClick={() => setShowModal(false)} className="text-[#555555] hover:text-[#888888]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">
                  Title *
                </label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Task title"
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">
                    Assignee
                  </label>
                  <select
                    value={form.assignee}
                    onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a.agent_id} value={a.agent_id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                    className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p]} — {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="bg-[#222222] hover:bg-[#2a2a2a] text-[#ccc] text-xs rounded-md px-3 py-1.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.title.trim()}
                className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium disabled:opacity-50"
              >
                {creating && <Loader2 className="w-3 h-3 animate-spin" />}
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) closeTaskDetail(); }}
        >
          <div className="bg-[#111111] border border-[#222222] rounded-md w-full max-w-lg max-h-[80vh] overflow-y-auto mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222] sticky top-0 bg-[#111111] z-10">
              <div className="flex items-center gap-2">
                <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm font-medium", PRIORITY_COLORS[editForm.priority as Priority || selectedTask.priority])}>
                  {PRIORITY_LABELS[editForm.priority as Priority || selectedTask.priority]}
                </span>
                <span className="text-[10px] text-[#555555]">#{selectedTask.id.slice(0, 8)}</span>
              </div>
              <button onClick={closeTaskDetail} className="text-[#555555] hover:text-[#888888] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              {/* Title */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1.5">Title</label>
                <input
                  value={editForm.title ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1.5">Description</label>
                <textarea
                  value={editForm.description ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  placeholder="No description"
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2] resize-none transition-colors"
                />
              </div>

              {/* Status + Priority row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1.5">Status</label>
                  <select
                    value={editForm.status ?? selectedTask.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Status })}
                    className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1.5">Priority</label>
                  <select
                    value={editForm.priority ?? selectedTask.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as Priority })}
                    className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{PRIORITY_LABELS[p]} — {p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1.5">Assignee</label>
                <select
                  value={editForm.assignee ?? selectedTask.assignee ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, assignee: e.target.value || null })}
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                >
                  <option value="">Unassigned</option>
                  {agents.map((a) => (
                    <option key={a.agent_id} value={a.agent_id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1.5">Tags</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedTask.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#5e6ad2]/10 text-[#5e6ad2] border border-[#5e6ad2]/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Result box (if done) */}
              {(editForm.status === "done" || selectedTask.status === "done") && selectedTask.result && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1.5">Result</label>
                  <div className="bg-[#0a0a0a] border border-emerald-500/20 rounded-md px-4 py-3">
                    <p className="text-[12px] text-emerald-400/80 leading-relaxed">{selectedTask.result}</p>
                  </div>
                </div>
              )}

              {/* Meta dates */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#444444] font-medium mb-1">Created</p>
                  <p className="text-[11px] text-[#555555]">{formatDateFull(selectedTask.created_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#444444] font-medium mb-1">Updated</p>
                  <p className="text-[11px] text-[#555555]">{formatDateFull(selectedTask.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-5 py-4 border-t border-[#222222] flex items-center justify-between sticky bottom-0 bg-[#111111]">
              <button
                onClick={handleDeleteTask}
                disabled={deleting}
                className={clsx(
                  "flex items-center gap-1.5 text-xs rounded-md px-3 py-1.5 transition-colors",
                  confirmDelete
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "text-[#555555] hover:text-red-400 hover:bg-red-500/10"
                )}
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                {confirmDelete ? "Confirm Delete" : "Delete"}
              </button>
              <div className="flex items-center gap-2">
                {confirmDelete && (
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-[#555555] hover:text-[#888888] px-2 py-1.5"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSaveTask}
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
