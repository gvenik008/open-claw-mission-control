"use client";

import { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import {
  Search, Plus, X, Pencil, Trash2, Wrench, Sparkles, ChevronDown, ChevronUp,
  Check, Loader2, Filter, Zap, BookOpen, Code, Shield, BarChart3, Layout,
  GitBranch, Database, Target,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Skill {
  id: string; name: string; category: string; description: string;
  requiredTools: string[]; promptAdditions?: string;
}
interface Tool {
  id: string; name: string; category: string; description: string;
}

type Tab = "skills" | "tools";

const toKebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

// Category icons
const CATEGORY_ICONS: Record<string, any> = {
  "QA & Testing": Target, "Development": Code, "DevOps & Infrastructure": GitBranch,
  "Security": Shield, "Research & Analysis": BarChart3, "Design & UX": Layout,
  "Project Management": BookOpen, "Data": Database, "Web": Zap, "System": Wrench,
  "Communication": Sparkles, "Automation": GitBranch, "Orchestration": Zap,
  "Device": Target, "Infrastructure": GitBranch, "Custom": Wrench,
};

const CATEGORY_COLORS: Record<string, string> = {
  "QA & Testing": "#f59e0b", "Development": "#10b981", "DevOps & Infrastructure": "#06b6d4",
  "Security": "#ef4444", "Research & Analysis": "#8b5cf6", "Design & UX": "#ec4899",
  "Project Management": "#f97316", "Data": "#3b82f6", "Web": "#5e6ad2", "System": "#888888",
  "Communication": "#10b981", "Automation": "#06b6d4", "Orchestration": "#5e6ad2",
  "Device": "#f59e0b", "Infrastructure": "#06b6d4", "Custom": "#888888",
};

function getCatIcon(cat: string) { return CATEGORY_ICONS[cat] || Sparkles; }
function getCatColor(cat: string) { return CATEGORY_COLORS[cat] || "#888888"; }

// ─── Skill Card ───────────────────────────────────────────────────────────────

function SkillCard({ skill, onEdit, onDelete }: { skill: Skill; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const color = getCatColor(skill.category);

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl overflow-hidden hover:border-[#333333] transition-all group">
      <div className="h-0.5" style={{ backgroundColor: color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-semibold text-[#f5f5f5] mb-0.5">{skill.name}</h3>
            <p className="text-[11px] text-[#888888] leading-relaxed line-clamp-2">{skill.description}</p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-lg text-[#555555] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={() => { if (confirm(`Delete "${skill.name}"?`)) onDelete(); }}
              className="p-1.5 rounded-lg text-[#555555] hover:text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Required tools */}
        {skill.requiredTools?.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-2">
            {skill.requiredTools.map((t) => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#5e6ad2]/10 text-[#5e6ad2] font-mono">{t}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a]">
          <span className="text-[9px] text-[#555555] font-mono">{skill.id}</span>
          {skill.promptAdditions && (
            <button onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] text-[#555555] hover:text-[#888888] transition-colors">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Prompt
            </button>
          )}
        </div>

        {expanded && skill.promptAdditions && (
          <div className="mt-2 p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
            <p className="text-[10px] text-[#888888] leading-relaxed whitespace-pre-wrap">{skill.promptAdditions}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({ tool, onEdit, onDelete }: { tool: Tool; onEdit: () => void; onDelete: () => void }) {
  const color = getCatColor(tool.category);

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl overflow-hidden hover:border-[#333333] transition-all group">
      <div className="h-0.5" style={{ backgroundColor: color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, color }}>
              <Wrench className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[13px] font-semibold text-[#f5f5f5] mb-0.5">{tool.name}</h3>
              <p className="text-[11px] text-[#888888] leading-relaxed">{tool.description}</p>
              <span className="text-[9px] text-[#555555] font-mono mt-1 inline-block">{tool.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-lg text-[#555555] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all"><Pencil className="w-3 h-3" /></button>
            <button onClick={() => { if (confirm(`Delete "${tool.name}"?`)) onDelete(); }}
              className="p-1.5 rounded-lg text-[#555555] hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function FormModal({ type, item, onSave, onClose }: {
  type: "skill" | "tool"; item?: Skill | Tool; onSave: (data: any) => Promise<void>; onClose: () => void;
}) {
  const isEdit = !!item;
  const isSkill = type === "skill";
  const [form, setForm] = useState({
    name: item?.name || "", id: item?.id || "", category: item?.category || "",
    description: item?.description || "",
    requiredTools: (item as Skill)?.requiredTools?.join(", ") || "",
    promptAdditions: (item as Skill)?.promptAdditions || "",
  });
  const [saving, setSaving] = useState(false);
  const [idManual, setIdManual] = useState(isEdit);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const data: any = { id: form.id || toKebab(form.name), name: form.name, category: form.category || "Custom", description: form.description };
    if (isSkill) {
      data.requiredTools = form.requiredTools.split(",").map((s) => s.trim()).filter(Boolean);
      data.promptAdditions = form.promptAdditions;
    }
    await onSave(data);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#111111] border border-[#222222] rounded-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222]">
          <h2 className="text-[14px] font-semibold text-[#f5f5f5]">{isEdit ? "Edit" : "New"} {isSkill ? "Skill" : "Tool"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#222222] rounded-lg transition-colors"><X className="w-4 h-4 text-[#555555]" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Name *</label>
              <input className="w-full bg-[#0a0a0a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2]"
                placeholder={isSkill ? "e.g. API Testing" : "e.g. Docker"} value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, id: idManual ? f.id : toKebab(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">ID</label>
              <input className="w-full bg-[#0a0a0a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] font-mono placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2]"
                placeholder="auto" value={form.id} disabled={isEdit}
                onChange={(e) => { setIdManual(true); setForm((f) => ({ ...f, id: e.target.value })); }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Category</label>
            <input className="w-full bg-[#0a0a0a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2]"
              placeholder="e.g. QA & Testing" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Description</label>
            <textarea className="w-full bg-[#0a0a0a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] resize-none"
              rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          {isSkill && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Required Tools</label>
                <input className="w-full bg-[#0a0a0a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2]"
                  placeholder="browser, shell, web_fetch" value={form.requiredTools} onChange={(e) => setForm((f) => ({ ...f, requiredTools: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#888888] uppercase tracking-wider font-medium">Prompt Additions</label>
                <textarea className="w-full bg-[#0a0a0a] border border-[#222222] rounded-lg px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] resize-none"
                  rows={3} value={form.promptAdditions} onChange={(e) => setForm((f) => ({ ...f, promptAdditions: e.target.value }))} />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#222222]">
          <button onClick={onClose} className="px-3 py-1.5 text-[13px] text-[#555555] hover:text-[#888888]">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white font-medium disabled:opacity-40 transition-all">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {isEdit ? "Save" : "Create"}
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
  const [filterCat, setFilterCat] = useState("all");
  const [modal, setModal] = useState<{ type: "skill" | "tool"; item?: Skill | Tool } | null>(null);

  const loadSkills = useCallback(() => fetch("/api/skills").then((r) => r.json()).then(setSkills).catch(() => {}), []);
  const loadTools = useCallback(() => fetch("/api/tools").then((r) => r.json()).then(setTools).catch(() => {}), []);
  useEffect(() => { loadSkills(); loadTools(); }, [loadSkills, loadTools]);

  const filteredSkills = skills.filter((s) => {
    const q = !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.description.toLowerCase().includes(query.toLowerCase());
    const c = filterCat === "all" || s.category === filterCat;
    return q && c;
  });
  const filteredTools = tools.filter((t) => {
    const q = !query || t.name.toLowerCase().includes(query.toLowerCase()) || t.description.toLowerCase().includes(query.toLowerCase());
    const c = filterCat === "all" || t.category === filterCat;
    return q && c;
  });

  const categories = Array.from(new Set(
    (tab === "skills" ? skills : tools).map((x) => x.category)
  )).sort();

  const grouped = tab === "skills"
    ? filteredSkills.reduce<Record<string, Skill[]>>((a, s) => { (a[s.category] = a[s.category] || []).push(s); return a; }, {})
    : filteredTools.reduce<Record<string, Tool[]>>((a, t) => { (a[t.category] = a[t.category] || []).push(t); return a; }, {});

  const handleSave = async (data: any) => {
    const endpoint = tab === "skills" ? "/api/skills" : "/api/tools";
    const list = tab === "skills" ? skills : tools;
    const method = list.find((x) => x.id === data.id) ? "PATCH" : "POST";
    await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    tab === "skills" ? await loadSkills() : await loadTools();
    setModal(null);
  };

  const handleDelete = async (id: string) => {
    const endpoint = tab === "skills" ? "/api/skills" : "/api/tools";
    await fetch(endpoint, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    tab === "skills" ? await loadSkills() : await loadTools();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Skills & Tools</h1>
          <p className="text-sm text-[#555555] mt-1">
            {skills.length} skill{skills.length !== 1 ? "s" : ""} · {tools.length} tool{tools.length !== 1 ? "s" : ""} in registry
          </p>
        </div>
        <button onClick={() => setModal({ type: tab === "skills" ? "skill" : "tool" })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white font-medium transition-all shadow-lg shadow-[#5e6ad2]/10">
          <Plus className="w-4 h-4" /> New {tab === "skills" ? "Skill" : "Tool"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <button onClick={() => { setTab("skills"); setFilterCat("all"); }}
          className={clsx("bg-[#111111] border rounded-lg p-4 text-left transition-all",
            tab === "skills" ? "border-[#5e6ad2]/40 shadow-lg shadow-[#5e6ad2]/5" : "border-[#222222] hover:border-[#333333]")}>
          <div className="flex items-center justify-between mb-2">
            <Sparkles className="w-4 h-4 text-[#f59e0b]" />
            <span className="text-xl font-bold text-[#f5f5f5]">{skills.length}</span>
          </div>
          <p className="text-[11px] text-[#888888]">Total Skills</p>
        </button>
        <button onClick={() => { setTab("tools"); setFilterCat("all"); }}
          className={clsx("bg-[#111111] border rounded-lg p-4 text-left transition-all",
            tab === "tools" ? "border-[#5e6ad2]/40 shadow-lg shadow-[#5e6ad2]/5" : "border-[#222222] hover:border-[#333333]")}>
          <div className="flex items-center justify-between mb-2">
            <Wrench className="w-4 h-4 text-[#5e6ad2]" />
            <span className="text-xl font-bold text-[#f5f5f5]">{tools.length}</span>
          </div>
          <p className="text-[11px] text-[#888888]">Total Tools</p>
        </button>
        <div className="bg-[#111111] border border-[#222222] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Filter className="w-4 h-4 text-[#10b981]" />
            <span className="text-xl font-bold text-[#f5f5f5]">{categories.length}</span>
          </div>
          <p className="text-[11px] text-[#888888]">Categories</p>
        </div>
        <div className="bg-[#111111] border border-[#222222] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-4 h-4 text-[#8b5cf6]" />
            <span className="text-xl font-bold text-[#f5f5f5]">
              {tab === "skills" ? new Set(skills.flatMap((s) => s.requiredTools || [])).size : "—"}
            </span>
          </div>
          <p className="text-[11px] text-[#888888]">{tab === "skills" ? "Tools Required" : "—"}</p>
        </div>
      </div>

      {/* Tabs + Search + Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-[#111111] border border-[#222222] rounded-lg p-0.5">
          <button onClick={() => { setTab("skills"); setFilterCat("all"); setQuery(""); }}
            className={clsx("flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all",
              tab === "skills" ? "bg-[#1a1a1a] text-[#f5f5f5]" : "text-[#555555] hover:text-[#888888]")}>
            <Sparkles className="w-3.5 h-3.5" /> Skills
          </button>
          <button onClick={() => { setTab("tools"); setFilterCat("all"); setQuery(""); }}
            className={clsx("flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all",
              tab === "tools" ? "bg-[#1a1a1a] text-[#f5f5f5]" : "text-[#555555] hover:text-[#888888]")}>
            <Wrench className="w-3.5 h-3.5" /> Tools
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555]" />
          <input className="w-full bg-[#111111] border border-[#222222] rounded-lg pl-10 pr-4 py-2.5 text-[13px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2]"
            placeholder={`Search ${tab}...`} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {categories.length > 1 && (
          <select className="bg-[#111111] border border-[#222222] rounded-lg px-3 py-2.5 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]"
            value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Content */}
      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => {
        const CatIcon = getCatIcon(category);
        const catColor = getCatColor(category);
        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${catColor}15`, color: catColor }}>
                <CatIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[13px] font-semibold text-[#f5f5f5]">{category}</span>
              <span className="text-[11px] text-[#555555]">({(items as any[]).length})</span>
            </div>
            <div className={clsx("grid gap-3 mb-6", tab === "skills" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2")}>
              {(items as any[]).map((item: any) =>
                tab === "skills" ? (
                  <SkillCard key={item.id} skill={item} onEdit={() => setModal({ type: "skill", item })} onDelete={() => handleDelete(item.id)} />
                ) : (
                  <ToolCard key={item.id} tool={item} onEdit={() => setModal({ type: "tool", item })} onDelete={() => handleDelete(item.id)} />
                )
              )}
            </div>
          </div>
        );
      })}

      {(tab === "skills" ? filteredSkills : filteredTools).length === 0 && (
        <div className="text-center py-16">
          {tab === "skills" ? <Sparkles className="w-10 h-10 text-[#333333] mx-auto mb-3" /> : <Wrench className="w-10 h-10 text-[#333333] mx-auto mb-3" />}
          <p className="text-[14px] font-medium text-[#555555]">{query ? "No results" : `No ${tab}`}</p>
        </div>
      )}

      {/* Modal */}
      {modal && <FormModal type={modal.type} item={modal.item} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
}
