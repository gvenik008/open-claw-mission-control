"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import {
  Search,
  Plus,
  X,
  Pencil,
  Trash2,
  Wrench,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  requiredTools: string[];
  promptAdditions?: string;
}

interface Tool {
  id: string;
  name: string;
  category: string;
  description: string;
}

type Tab = "skills" | "tools";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toKebab = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

// ─── Skill Card ───────────────────────────────────────────────────────────────

function SkillCard({
  skill,
  onEdit,
  onDelete,
}: {
  skill: Skill;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-md p-4 hover:border-[#2a2a2a] transition-all group">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-medium text-[#f5f5f5]">{skill.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#1a1a1a] text-[#666666]">
              {skill.category}
            </span>
          </div>
          <p className="text-[12px] text-[#888888] leading-relaxed">{skill.description}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md text-[#555555] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all"
            title="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete skill "${skill.name}"?`)) onDelete();
            }}
            className="p-1.5 rounded-md text-[#555555] hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[#1a1a1a] text-[#555555]">
          {skill.id}
        </span>
        {skill.requiredTools && skill.requiredTools.length > 0 && (
          <>
            {skill.requiredTools.map((t) => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#5e6ad2]/10 text-[#5e6ad2]"
              >
                {t}
              </span>
            ))}
          </>
        )}
      </div>

      {/* Expandable prompt additions */}
      {skill.promptAdditions && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] text-[#555555] hover:text-[#888888] mt-2 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Prompt additions
        </button>
      )}
      {expanded && skill.promptAdditions && (
        <div className="mt-2 p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-md">
          <p className="text-[11px] text-[#888888] leading-relaxed whitespace-pre-wrap">
            {skill.promptAdditions}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({
  tool,
  onEdit,
  onDelete,
}: {
  tool: Tool;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-[#111111] border border-[#222222] rounded-md p-4 hover:border-[#2a2a2a] transition-all group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-medium text-[#f5f5f5]">{tool.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#1a1a1a] text-[#666666]">
              {tool.category}
            </span>
          </div>
          <p className="text-[12px] text-[#888888] leading-relaxed">{tool.description}</p>
          <span className="text-[10px] font-mono text-[#555555] mt-1 inline-block">
            {tool.id}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md text-[#555555] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all"
            title="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete tool "${tool.name}"?`)) onDelete();
            }}
            className="p-1.5 rounded-md text-[#555555] hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skill Form Modal ─────────────────────────────────────────────────────────

function SkillFormModal({
  skill,
  onSave,
  onClose,
}: {
  skill?: Skill;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const isEdit = !!skill;
  const [form, setForm] = useState({
    name: skill?.name || "",
    id: skill?.id || "",
    category: skill?.category || "",
    description: skill?.description || "",
    requiredTools: skill?.requiredTools?.join(", ") || "",
    promptAdditions: skill?.promptAdditions || "",
  });
  const [saving, setSaving] = useState(false);
  const [idManual, setIdManual] = useState(isEdit);

  const handleSave = async () => {
    if (!form.name.trim() || !form.category.trim()) return;
    setSaving(true);
    await onSave({
      id: form.id || toKebab(form.name),
      name: form.name,
      category: form.category,
      description: form.description,
      requiredTools: form.requiredTools
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      promptAdditions: form.promptAdditions,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#111111] border border-[#222222] rounded-md w-full max-w-lg mx-4 max-h-[85vh] overflow-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222]">
          <h2 className="text-[13px] font-medium text-[#f5f5f5]">
            {isEdit ? "Edit Skill" : "New Skill"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#222222] rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-[#555555]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2]"
                placeholder="e.g. API Testing"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    id: idManual ? f.id : toKebab(name),
                  }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">
                ID
              </label>
              <input
                className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] font-mono focus:outline-none focus:border-[#5e6ad2]"
                placeholder="auto-generated"
                value={form.id}
                disabled={isEdit}
                onChange={(e) => {
                  setIdManual(true);
                  setForm((f) => ({ ...f, id: e.target.value }));
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">
                Category <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2]"
                placeholder="e.g. QA & Testing"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">
                Required Tools
              </label>
              <input
                className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2]"
                placeholder="browser, shell, web_fetch"
                value={form.requiredTools}
                onChange={(e) => setForm((f) => ({ ...f, requiredTools: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">
              Description
            </label>
            <textarea
              className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] resize-none"
              rows={2}
              placeholder="What does this skill enable?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">
              Prompt Additions
            </label>
            <textarea
              className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] resize-none"
              rows={3}
              placeholder="System prompt text injected when this skill is active…"
              value={form.promptAdditions}
              onChange={(e) => setForm((f) => ({ ...f, promptAdditions: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#222222]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[13px] text-[#555555] hover:text-[#888888] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.category.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {isEdit ? "Save Changes" : "Create Skill"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tool Form Modal ──────────────────────────────────────────────────────────

function ToolFormModal({
  tool,
  onSave,
  onClose,
}: {
  tool?: Tool;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const isEdit = !!tool;
  const [form, setForm] = useState({
    name: tool?.name || "",
    id: tool?.id || "",
    category: tool?.category || "",
    description: tool?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [idManual, setIdManual] = useState(isEdit);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({
      id: form.id || toKebab(form.name),
      name: form.name,
      category: form.category || "Custom",
      description: form.description,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#111111] border border-[#222222] rounded-md w-full max-w-lg mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222]">
          <h2 className="text-[13px] font-medium text-[#f5f5f5]">
            {isEdit ? "Edit Tool" : "New Tool"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#222222] rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-[#555555]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2]"
                placeholder="e.g. Puppeteer"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    id: idManual ? f.id : toKebab(name),
                  }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">
                ID
              </label>
              <input
                className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] font-mono focus:outline-none focus:border-[#5e6ad2]"
                placeholder="auto-generated"
                value={form.id}
                disabled={isEdit}
                onChange={(e) => {
                  setIdManual(true);
                  setForm((f) => ({ ...f, id: e.target.value }));
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">
                Category
              </label>
              <input
                className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2]"
                placeholder="e.g. Web, System, Custom"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">
                Description
              </label>
              <input
                className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2]"
                placeholder="What this tool does"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#222222]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[13px] text-[#555555] hover:text-[#888888] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {isEdit ? "Save Changes" : "Create Tool"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SkillsToolsPage() {
  const [tab, setTab] = useState<Tab>("skills");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Modals
  const [skillModal, setSkillModal] = useState<{ open: boolean; skill?: Skill }>({ open: false });
  const [toolModal, setToolModal] = useState<{ open: boolean; tool?: Tool }>({ open: false });

  const loadSkills = () =>
    fetch("/api/skills").then((r) => r.json()).then(setSkills).catch(() => {});
  const loadTools = () =>
    fetch("/api/tools").then((r) => r.json()).then(setTools).catch(() => {});

  useEffect(() => {
    loadSkills();
    loadTools();
  }, []);

  // Filtered lists
  const filteredSkills = skills.filter((s) => {
    const matchQ =
      !query ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase()) ||
      s.id.toLowerCase().includes(query.toLowerCase());
    const matchCat = filterCategory === "all" || s.category === filterCategory;
    return matchQ && matchCat;
  });

  const filteredTools = tools.filter((t) => {
    const matchQ =
      !query ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase()) ||
      t.id.toLowerCase().includes(query.toLowerCase());
    const matchCat = filterCategory === "all" || t.category === filterCategory;
    return matchQ && matchCat;
  });

  const skillCategories = Array.from(new Set(skills.map((s) => s.category))).sort();
  const toolCategories = Array.from(new Set(tools.map((t) => t.category))).sort();
  const categories = tab === "skills" ? skillCategories : toolCategories;

  // Group by category
  const groupedSkills = filteredSkills.reduce<Record<string, Skill[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  const groupedTools = filteredTools.reduce<Record<string, Tool[]>>((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {});

  // CRUD handlers
  const handleSaveSkill = async (data: any) => {
    const method = skills.find((s) => s.id === data.id) ? "PATCH" : "POST";
    await fetch("/api/skills", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await loadSkills();
    setSkillModal({ open: false });
  };

  const handleDeleteSkill = async (id: string) => {
    await fetch("/api/skills", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadSkills();
  };

  const handleSaveTool = async (data: any) => {
    const method = tools.find((t) => t.id === data.id) ? "PATCH" : "POST";
    await fetch("/api/tools", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await loadTools();
    setToolModal({ open: false });
  };

  const handleDeleteTool = async (id: string) => {
    await fetch("/api/tools", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadTools();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Skills & Tools</h1>
          <p className="text-sm text-[#555555] mt-0.5">
            {skills.length} skill{skills.length !== 1 ? "s" : ""} · {tools.length} tool
            {tools.length !== 1 ? "s" : ""} in registry
          </p>
        </div>
        <button
          onClick={() =>
            tab === "skills"
              ? setSkillModal({ open: true })
              : setToolModal({ open: true })
          }
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white font-medium transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New {tab === "skills" ? "Skill" : "Tool"}
        </button>
      </div>

      {/* Tabs + Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-[#111111] border border-[#222222] rounded-md p-0.5">
          <button
            onClick={() => {
              setTab("skills");
              setFilterCategory("all");
              setQuery("");
            }}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all",
              tab === "skills"
                ? "bg-[#1a1a1a] text-[#f5f5f5]"
                : "text-[#555555] hover:text-[#888888]"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Skills
            <span className="text-[11px] text-[#555555] ml-0.5">{skills.length}</span>
          </button>
          <button
            onClick={() => {
              setTab("tools");
              setFilterCategory("all");
              setQuery("");
            }}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all",
              tab === "tools"
                ? "bg-[#1a1a1a] text-[#f5f5f5]"
                : "text-[#555555] hover:text-[#888888]"
            )}
          >
            <Wrench className="w-3.5 h-3.5" />
            Tools
            <span className="text-[11px] text-[#555555] ml-0.5">{tools.length}</span>
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555555]" />
          <input
            className="w-full bg-[#111111] border border-[#222222] rounded-md pl-8 pr-3 py-1.5 text-[13px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2] transition-colors"
            placeholder={`Search ${tab}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {categories.length > 1 && (
          <select
            className="bg-[#111111] border border-[#222222] rounded-md px-3 py-1.5 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2] transition-colors"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {tab === "skills" && (
        <div className="space-y-6">
          {Object.entries(groupedSkills)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#555555]" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#555555]">
                    {category}
                  </span>
                  <span className="text-[11px] text-[#444444]">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      onEdit={() => setSkillModal({ open: true, skill })}
                      onDelete={() => handleDeleteSkill(skill.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          {filteredSkills.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="w-8 h-8 text-[#333333] mx-auto mb-3" />
              <p className="text-[13px] text-[#555555]">
                {query ? "No skills match your search" : "No skills in registry"}
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "tools" && (
        <div className="space-y-6">
          {Object.entries(groupedTools)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-3.5 h-3.5 text-[#555555]" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#555555]">
                    {category}
                  </span>
                  <span className="text-[11px] text-[#444444]">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      onEdit={() => setToolModal({ open: true, tool })}
                      onDelete={() => handleDeleteTool(tool.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          {filteredTools.length === 0 && (
            <div className="text-center py-12">
              <Wrench className="w-8 h-8 text-[#333333] mx-auto mb-3" />
              <p className="text-[13px] text-[#555555]">
                {query ? "No tools match your search" : "No tools in registry"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {skillModal.open && (
        <SkillFormModal
          skill={skillModal.skill}
          onSave={handleSaveSkill}
          onClose={() => setSkillModal({ open: false })}
        />
      )}
      {toolModal.open && (
        <ToolFormModal
          tool={toolModal.tool}
          onSave={handleSaveTool}
          onClose={() => setToolModal({ open: false })}
        />
      )}
    </div>
  );
}
