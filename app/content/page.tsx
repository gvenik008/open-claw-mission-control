"use client";

import { useState, useEffect } from "react";
import { Plus, X, FileText, Share2, Video, Mail } from "lucide-react";
import clsx from "clsx";

type ContentType = "Blog" | "Social" | "Video" | "Email";
type ContentStatus = "Draft" | "Published" | "Scheduled";

interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  body: string;
  date: string;
  scheduleDate?: string;
}

const TYPE_CONFIG: Record<ContentType, { color: string; icon: typeof FileText }> = {
  Blog: { color: "bg-cyan-500/10 text-cyan-400", icon: FileText },
  Social: { color: "bg-purple-500/10 text-purple-400", icon: Share2 },
  Video: { color: "bg-orange-500/10 text-orange-400", icon: Video },
  Email: { color: "bg-green-500/10 text-green-400", icon: Mail },
};

const STATUS_COLORS: Record<ContentStatus, string> = {
  Draft: "bg-yellow-500/10 text-yellow-400",
  Published: "bg-emerald-500/10 text-emerald-400",
  Scheduled: "bg-blue-500/10 text-blue-400",
};

const DEFAULT_CONTENT: ContentItem[] = [
  { id: "c1", title: "Getting Started with OpenClaw", type: "Blog", status: "Published", body: "A comprehensive guide to setting up OpenClaw...", date: "2026-03-15" },
  { id: "c2", title: "New Agent Features Announcement", type: "Social", status: "Published", body: "Excited to announce our latest agent capabilities!", date: "2026-03-16" },
  { id: "c3", title: "Mission Control Walkthrough", type: "Video", status: "Scheduled", body: "Video tutorial covering all Mission Control features", date: "2026-03-18", scheduleDate: "2026-03-20" },
  { id: "c4", title: "Weekly Team Update", type: "Email", status: "Draft", body: "Hi team, here's what happened this week...", date: "2026-03-18" },
  { id: "c5", title: "AI Pipeline Best Practices", type: "Blog", status: "Draft", body: "Tips for building efficient automation pipelines...", date: "2026-03-17" },
  { id: "c6", title: "Community Showcase Reel", type: "Video", status: "Scheduled", body: "Highlights from our community projects", date: "2026-03-18", scheduleDate: "2026-03-22" },
  { id: "c7", title: "Product Hunt Launch Post", type: "Social", status: "Draft", body: "We're launching on Product Hunt next week!", date: "2026-03-18" },
  { id: "c8", title: "Onboarding Welcome Email", type: "Email", status: "Published", body: "Welcome to OpenClaw! Here's how to get started...", date: "2026-03-14" },
];

type FilterTab = "All" | ContentStatus;

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [filter, setFilter] = useState<FilterTab>("All");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", type: "Blog" as ContentType, body: "", scheduleDate: "" });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mc-content");
      if (stored) setItems(JSON.parse(stored));
      else { setItems(DEFAULT_CONTENT); localStorage.setItem("mc-content", JSON.stringify(DEFAULT_CONTENT)); }
    } catch { setItems(DEFAULT_CONTENT); }
  }, []);

  function save(updated: ContentItem[]) {
    setItems(updated);
    localStorage.setItem("mc-content", JSON.stringify(updated));
  }

  function handleCreate() {
    if (!form.title.trim()) return;
    const item: ContentItem = {
      id: "c-" + Date.now(),
      title: form.title,
      type: form.type,
      status: form.scheduleDate ? "Scheduled" : "Draft",
      body: form.body,
      date: new Date().toISOString().split("T")[0],
      scheduleDate: form.scheduleDate || undefined,
    };
    save([item, ...items]);
    setForm({ title: "", type: "Blog", body: "", scheduleDate: "" });
    setShowModal(false);
  }

  const tabs: FilterTab[] = ["All", "Draft", "Published", "Scheduled"];
  const filtered = filter === "All" ? items : items.filter((i) => i.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Content</h1>
          <p className="text-sm text-[#555555] mt-0.5">Manage blog posts, social content, videos & emails</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Content
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-[#222222] pb-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={clsx("text-xs px-3 py-1.5 rounded-md transition-colors", filter === t ? "bg-[#1a1a1a] text-[#f5f5f5]" : "text-[#555555] hover:text-[#888888]")}>
            {t} {t !== "All" && <span className="ml-1 text-[10px]">({items.filter((i) => i.status === t).length})</span>}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((item) => {
          const TypeIcon = TYPE_CONFIG[item.type].icon;
          return (
            <div key={item.id} className="bg-[#111111] border border-[#222222] rounded-md p-4 hover:bg-[#1a1a1a] transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TypeIcon className="w-4 h-4 text-[#555555]" />
                  <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm font-medium", TYPE_CONFIG[item.type].color)}>{item.type}</span>
                </div>
                <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm font-medium", STATUS_COLORS[item.status])}>{item.status}</span>
              </div>
              <h3 className="text-[13px] text-[#f5f5f5] font-medium mb-1">{item.title}</h3>
              <p className="text-[11px] text-[#555555] line-clamp-2 mb-3">{item.body}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#555555]">{item.date}</span>
                {item.scheduleDate && <span className="text-[10px] text-blue-400">📅 {item.scheduleDate}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#111111] border border-[#222222] rounded-md w-[28rem] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#f5f5f5]">New Content</h2>
              <button onClick={() => setShowModal(false)} className="text-[#555555] hover:text-[#888888]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Title</label>
                <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Content title" className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2]" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContentType })} className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]">
                  {(["Blog", "Social", "Video", "Email"] as ContentType[]).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Body</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Content body..." rows={4} className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2] resize-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Schedule Date (optional)</label>
                <input type="date" value={form.scheduleDate} onChange={(e) => setForm({ ...form, scheduleDate: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]" />
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
