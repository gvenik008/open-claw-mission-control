"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, X } from "lucide-react";
import clsx from "clsx";

type Priority = "P0" | "P1" | "P2" | "P3";
type Column = "Backlog" | "In Progress" | "Review" | "Done";

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: Priority;
  column: Column;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  text: string;
  time: string;
}

const COLUMNS: Column[] = ["Backlog", "In Progress", "Review", "Done"];
const AGENTS = ["Gvenik", "QA Lead", "Functional QA", "Adversarial QA"];
const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];

const PRIORITY_COLORS: Record<Priority, string> = {
  P0: "bg-red-500/10 text-red-400",
  P1: "bg-orange-500/10 text-orange-400",
  P2: "bg-yellow-500/10 text-yellow-400",
  P3: "bg-[#222222] text-[#888888]",
};

const DEFAULT_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Define severity matrix",
    description: "Create P0–P3 severity definitions",
    assignee: "QA Lead",
    priority: "P1",
    column: "Done",
    createdAt: "2026-03-17",
  },
  {
    id: "task-2",
    title: "Write smoke test suite",
    description: "Cover happy paths for core flows",
    assignee: "Functional QA",
    priority: "P1",
    column: "In Progress",
    createdAt: "2026-03-18",
  },
  {
    id: "task-3",
    title: "Adversarial fuzzing on API",
    description: "Fuzz API endpoints with edge inputs",
    assignee: "Adversarial QA",
    priority: "P0",
    column: "Backlog",
    createdAt: "2026-03-18",
  },
  {
    id: "task-4",
    title: "Mission Control UI review",
    description: "Review all pages for design consistency",
    assignee: "Gvenik",
    priority: "P2",
    column: "Review",
    createdAt: "2026-03-18",
  },
];

function formatDate(str: string) {
  const d = new Date(str);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignee: AGENTS[0],
    priority: "P2" as Priority,
  });
  const dragOverCol = useRef<Column | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mc-tasks");
      if (stored) {
        setTasks(JSON.parse(stored));
      } else {
        setTasks(DEFAULT_TASKS);
        localStorage.setItem("mc-tasks", JSON.stringify(DEFAULT_TASKS));
      }
    } catch {
      setTasks(DEFAULT_TASKS);
    }
    setActivity([
      { id: "a1", text: "Adversarial QA created task 'API fuzzing'", time: "2m ago" },
      { id: "a2", text: "Gvenik moved task to Review", time: "15m ago" },
      { id: "a3", text: "Functional QA started smoke tests", time: "1h ago" },
      { id: "a4", text: "QA Lead completed severity matrix", time: "3h ago" },
    ]);
  }, []);

  function saveTasks(updated: Task[]) {
    setTasks(updated);
    localStorage.setItem("mc-tasks", JSON.stringify(updated));
  }

  function addActivity(text: string) {
    const item: ActivityItem = { id: Date.now().toString(), text, time: "just now" };
    setActivity((prev) => [item, ...prev.slice(0, 9)]);
  }

  function handleCreate() {
    if (!form.title.trim()) return;
    const task: Task = {
      id: "task-" + Date.now(),
      title: form.title,
      description: form.description,
      assignee: form.assignee,
      priority: form.priority,
      column: "Backlog",
      createdAt: new Date().toISOString().split("T")[0],
    };
    const updated = [...tasks, task];
    saveTasks(updated);
    addActivity(`${form.assignee} created task '${form.title}'`);
    setForm({ title: "", description: "", assignee: AGENTS[0], priority: "P2" });
    setShowModal(false);
  }

  function onDragStart(id: string) {
    setDragging(id);
  }

  function onDragOver(e: React.DragEvent, col: Column) {
    e.preventDefault();
    dragOverCol.current = col;
  }

  function onDrop(col: Column) {
    if (!dragging) return;
    const task = tasks.find((t) => t.id === dragging);
    if (task && task.column !== col) {
      const updated = tasks.map((t) => (t.id === dragging ? { ...t, column: col } : t));
      saveTasks(updated);
      addActivity(`Moved '${task.title}' to ${col}`);
    }
    setDragging(null);
    dragOverCol.current = null;
  }

  const byColumn = (col: Column) => tasks.filter((t) => t.column === col);

  return (
    <div className="flex gap-4 h-full">
      {/* Main board */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Tasks</h1>
            <p className="text-sm text-[#555555] mt-0.5">Kanban board</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Task
          </button>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-4 gap-3">
          {COLUMNS.map((col) => {
            const colTasks = byColumn(col);
            return (
              <div
                key={col}
                className="flex flex-col gap-2 min-h-48"
                onDragOver={(e) => onDragOver(e, col)}
                onDrop={() => onDrop(col)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-0 py-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#555555] font-medium">
                    {col}
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm font-medium", PRIORITY_COLORS[task.priority])}>
                        {task.priority}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888] truncate max-w-[80px]">
                        {task.assignee}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#555555] mt-1.5">{formatDate(task.createdAt)}</p>
                  </div>
                ))}

                {/* Drop zone placeholder */}
                {colTasks.length === 0 && (
                  <div className="border border-dashed border-[#2a2a2a] rounded-md h-16 flex items-center justify-center">
                    <span className="text-[11px] text-[#555555]">Drop here</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity feed */}
      <div className="w-52 shrink-0">
        <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[#222222]">
            <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium">Activity</p>
          </div>
          <div className="divide-y divide-[#222222]">
            {activity.map((item) => (
              <div key={item.id} className="px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors duration-150">
                <p className="text-[11px] text-[#888888] leading-snug">{item.text}</p>
                <p className="text-[10px] text-[#555555] mt-1">{item.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
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
                  Title
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
                    {AGENTS.map((a) => (
                      <option key={a} value={a}>
                        {a}
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
                        {p}
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
                className="bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
