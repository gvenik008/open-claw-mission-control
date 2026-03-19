"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { Sparkles, Wrench, Plus, Trash2, Search, X, Loader2 } from "lucide-react";

interface Skill { id: string; name: string; category: string; description: string; requiredTools: string[]; promptAdditions: string; }
interface Tool { id: string; name: string; category: string; description: string; }

type Tab = "skills" | "tools";

export default function SharedRegistryPage() {
  const [tab, setTab] = useState<Tab>("skills");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [query, setQuery] = useState("");

  const loadSkills = () => fetch("/api/admin/shared-skills").then(r => r.json()).then(setSkills).catch(() => {});
  const loadTools = () => fetch("/api/admin/shared-tools").then(r => r.json()).then(setTools).catch(() => {});

  useEffect(() => { loadSkills(); loadTools(); }, []);

  const filteredSkills = skills.filter(s =>
    !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.category.toLowerCase().includes(query.toLowerCase())
  );
  const filteredTools = tools.filter(t =>
    !query || t.name.toLowerCase().includes(query.toLowerCase()) || t.category.toLowerCase().includes(query.toLowerCase())
  );

  const deleteSkill = async (id: string) => {
    if (!confirm(`Delete shared skill "${id}"?`)) return;
    await fetch("/api/admin/shared-skills", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadSkills();
  };
  const deleteTool = async (id: string) => {
    if (!confirm(`Delete shared tool "${id}"?`)) return;
    await fetch("/api/admin/shared-tools", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadTools();
  };

  const grouped = tab === "skills"
    ? filteredSkills.reduce<Record<string, Skill[]>>((a, s) => { (a[s.category] = a[s.category] || []).push(s); return a; }, {})
    : filteredTools.reduce<Record<string, Tool[]>>((a, t) => { (a[t.category] = a[t.category] || []).push(t); return a; }, {});

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Shared Registry</h1>
        <p className="text-sm text-[#555555] mt-0.5">
          Skills and tools shared with all instances. Only superadmin can modify.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center bg-[#111111] border border-[#222222] rounded-md p-0.5">
          <button onClick={() => { setTab("skills"); setQuery(""); }}
            className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all",
              tab === "skills" ? "bg-[#1a1a1a] text-[#f5f5f5]" : "text-[#555555] hover:text-[#888888]")}>
            <Sparkles className="w-3.5 h-3.5" /> Skills <span className="text-[11px] text-[#555555] ml-0.5">{skills.length}</span>
          </button>
          <button onClick={() => { setTab("tools"); setQuery(""); }}
            className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all",
              tab === "tools" ? "bg-[#1a1a1a] text-[#f5f5f5]" : "text-[#555555] hover:text-[#888888]")}>
            <Wrench className="w-3.5 h-3.5" /> Tools <span className="text-[11px] text-[#555555] ml-0.5">{tools.length}</span>
          </button>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555555]" />
          <input className="w-full bg-[#111111] border border-[#222222] rounded-md pl-8 pr-3 py-1.5 text-[13px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2]"
            placeholder={`Search ${tab}…`} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
        <div key={cat}>
          <div className="flex items-center gap-2 mb-2">
            {tab === "skills" ? <Sparkles className="w-3.5 h-3.5 text-[#555555]" /> : <Wrench className="w-3.5 h-3.5 text-[#555555]" />}
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#555555]">{cat}</span>
            <span className="text-[11px] text-[#444444]">({(items as any[]).length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {(items as any[]).map((item: any) => (
              <div key={item.id} className="bg-[#111111] border border-[#222222] rounded-md p-3 group hover:border-[#2a2a2a] transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-medium text-[#f5f5f5]">{item.name}</span>
                    </div>
                    <p className="text-[11px] text-[#888888] line-clamp-2">{item.description}</p>
                    <span className="text-[9px] text-[#555555] font-mono mt-1 inline-block">{item.id}</span>
                  </div>
                  <button onClick={() => tab === "skills" ? deleteSkill(item.id) : deleteTool(item.id)}
                    className="p-1.5 rounded-md text-[#333333] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
