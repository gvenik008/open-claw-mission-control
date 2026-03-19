"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import clsx from "clsx";

type Priority = "High" | "Medium" | "Low";
type Column = "Backlog" | "In Progress" | "Review" | "Done";

interface Project {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
  column: Column;
}

const COLUMNS: Column[] = ["Backlog", "In Progress", "Review", "Done"];
const ASSIGNEES = ["Samvel", "Gvenik", "Strategist", "Analyst", "Creative", "Executor"];

const PRIORITY_COLORS: Record<Priority, string> = {
  High: "bg-red-500/10 text-red-400",
  Medium: "bg-orange-500/10 text-orange-400",
  Low: "bg-[#222222] text-[#888888]",
};

const COL_ACCENT: Record<Column, string> = {
  Backlog: "border-t-[#555555]",
  "In Progress": "border-t-cyan-500",
  Review: "border-t-orange-500",
  Done: "border-t-emerald-500",
};

const DEFAULT_PROJECTS: Project[] = [
  { id: "p1", title: "Mission Control v2", description: "Build the next-gen dashboard with all 20 pages", assignee: "Gvenik", dueDate: "2026-03-25", priority: "High", column: "In Progress" },
  { id: "p2", title: "Skill Marketplace", description: "Platform for sharing and installing agent skills", assignee: "Strategist", dueDate: "2026-04-01", priority: "High", column: "Backlog" },
  { id: "p3", title: "Mobile App MVP", description: "React Native companion app for OpenClaw", assignee: "Samvel", dueDate: "2026-04-15", priority: "Medium", column: "Backlog" },
  { id: "p4", title: "Voice Integration", description: "Add voice input/output to agent conversations", assignee: "Creative", dueDate: "2026-03-28", priority: "Medium", column: "In Progress" },
  { id: "p5", title: "Analytics Dashboard", description: "Token usage, session metrics, cost tracking", assignee: "Analyst", dueDate: "2026-03-22", priority: "Low", column: "Review" },
  { id: "p6", title: "Gateway Auth Upgrade", description: "Implement OAuth2 and API key rotation", assignee: "Executor", dueDate: "2026-03-20", priority: "High", column: "Review" },
  { id: "p7", title: "Documentation Site", description: "Docusaurus-based docs with tutorials", assignee: "Creative", dueDate: "2026-03-30", priority: "Low", column: "Backlog" },
  { id: "p8", title: "CI/CD Pipeline", description: "GitHub Actions for automated testing & deploy", assignee: "Executor", dueDate: "2026-03-19", priority: "Medium", column: "Done" },
  { id: "p9", title: "Memory Compression", description: "Smarter memory management with summarization", assignee: "Analyst", dueDate: "2026-04-05", priority: "Medium", column: "In Progress" },
  { id: "p10", title: "Telegram Bot Upgrade", description: "Add inline queries and rich media support", assignee: "Gvenik", dueDate: "2026-03-21", priority: "Low", column: "Done" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignee: ASSIGNEES[0], dueDate: "", priority: "Medium" as Priority });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mc-projects");
      if (stored) setProjects(JSON.parse(stored));
      else { setProjects(DEFAULT_PROJECTS); localStorage.setItem("mc-projects", JSON.stringify(DEFAULT_PROJECTS)); }
    } catch { setProjects(DEFAULT_PROJECTS); }
  }, []);

  function save(updated: Project[]) {
    setProjects(updated);
    localStorage.setItem("mc-projects", JSON.stringify(updated));
  }

  function handleCreate() {
    if (!form.title.trim()) return;
    const project: Project = { id: "p-" + Date.now(), ...form, column: "Backlog" };
    save([...projects, project]);
    setForm({ title: "", description: "", assignee: ASSIGNEES[0], dueDate: "", priority: "Medium" });
    setShowModal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Projects</h1>
          <p className="text-sm text-[#555555] mt-0.5">Kanban board for project tracking</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Project
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const colProjects = projects.filter((p) => p.column === col);
          return (
            <div key={col} className="flex flex-col gap-2 min-h-48">
              <div className={clsx("flex items-center justify-between px-0 py-1 border-t-2", COL_ACCENT[col])}>
                <span className="text-[10px] uppercase tracking-wider text-[#555555] font-medium">{col}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888]">{colProjects.length}</span>
              </div>
              {colProjects.map((project) => (
                <div key={project.id} className="bg-[#111111] border border-[#222222] rounded-md px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors">
                  <p className="text-[13px] text-[#f5f5f5] leading-snug mb-1 font-medium">{project.title}</p>
                  <p className="text-[11px] text-[#555555] mb-2 line-clamp-2">{project.description}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm font-medium", PRIORITY_COLORS[project.priority])}>{project.priority}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888] truncate max-w-[80px]">{project.assignee}</span>
                  </div>
                  {project.dueDate && <p className="text-[10px] text-[#555555] mt-1.5">Due: {project.dueDate}</p>}
                </div>
              ))}
              {colProjects.length === 0 && (
                <div className="border border-dashed border-[#2a2a2a] rounded-md h-16 flex items-center justify-center">
                  <span className="text-[11px] text-[#555555]">No projects</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#111111] border border-[#222222] rounded-md w-96 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#f5f5f5]">New Project</h2>
              <button onClick={() => setShowModal(false)} className="text-[#555555] hover:text-[#888888]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Title</label>
                <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project title" className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2]" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Project description" rows={2} className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Assignee</label>
                  <select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]">
                    {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]">
                    {(["High", "Medium", "Low"] as Priority[]).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Due Date</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="bg-[#222222] hover:bg-[#2a2a2a] text-[#ccc] text-xs rounded-md px-3 py-1.5 transition-colors">Cancel</button>
              <button onClick={handleCreate} className="bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
