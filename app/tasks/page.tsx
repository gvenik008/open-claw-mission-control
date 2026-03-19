"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Plus, X, Loader2, RefreshCw } from "lucide-react";
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

const COLUMNS: { key: Status; label: string }[] = [
  { key: "pending", label: "Backlog" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];

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
    // Auto-refresh every 30s
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  function agentName(agentId: string | null): string {
    if (!agentId) return "Unassigned";
    const agent = agents.find((a) => a.agent_id === agentId);
    return agent?.name || agentId;
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
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => onDragStart(task.id)}
                    className={clsx(
                      "bg-[#111111] border border-[#222222] rounded-md px-3 py-2.5 cursor-grab active:cursor-grabbing hover:bg-[#1a1a1a] transition-colors duration-150",
                      dragging === task.id && "opacity-50"
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
                  </div>
                ))}

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
    </div>
  );
}
