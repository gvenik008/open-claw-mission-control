"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ShieldX, Clock } from "lucide-react";
import clsx from "clsx";

type ApprovalStatus = "Pending" | "Approved" | "Rejected";
type Priority = "High" | "Medium" | "Low";

interface ApprovalItem {
  id: string;
  requester: string;
  action: string;
  timestamp: string;
  priority: Priority;
  status: ApprovalStatus;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  High: "bg-red-500/10 text-red-400",
  Medium: "bg-orange-500/10 text-orange-400",
  Low: "bg-[#222222] text-[#888888]",
};

const DEFAULT_APPROVALS: ApprovalItem[] = [
  { id: "ap1", requester: "Gvenik", action: "Deploy new skill: web-scraper", timestamp: "2026-03-18T14:30:00", priority: "High", status: "Pending" },
  { id: "ap2", requester: "Strategist Agent", action: "Send weekly report email to team", timestamp: "2026-03-18T13:15:00", priority: "Medium", status: "Pending" },
  { id: "ap3", requester: "Creative Agent", action: "Publish blog post: AI Pipeline Best Practices", timestamp: "2026-03-18T12:00:00", priority: "Medium", status: "Pending" },
  { id: "ap4", requester: "Executor Agent", action: "Restart Gateway service", timestamp: "2026-03-18T11:45:00", priority: "High", status: "Pending" },
  { id: "ap5", requester: "Analyst Agent", action: "Export analytics data to CSV", timestamp: "2026-03-18T10:30:00", priority: "Low", status: "Pending" },
];

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [tab, setTab] = useState<ApprovalStatus>("Pending");
  const [confirm, setConfirm] = useState<{ id: string; action: "approve" | "reject" } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mc-approvals");
      if (stored) setItems(JSON.parse(stored));
      else { setItems(DEFAULT_APPROVALS); localStorage.setItem("mc-approvals", JSON.stringify(DEFAULT_APPROVALS)); }
    } catch { setItems(DEFAULT_APPROVALS); }
  }, []);

  function save(updated: ApprovalItem[]) {
    setItems(updated);
    localStorage.setItem("mc-approvals", JSON.stringify(updated));
  }

  function handleAction(id: string, newStatus: ApprovalStatus) {
    save(items.map((i) => (i.id === id ? { ...i, status: newStatus } : i)));
    setConfirm(null);
  }

  function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const tabs: ApprovalStatus[] = ["Pending", "Approved", "Rejected"];
  const filtered = items.filter((i) => i.status === tab);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Approvals</h1>
        <p className="text-sm text-[#555555] mt-0.5">Review and approve pending actions</p>
      </div>

      <div className="flex gap-1 border-b border-[#222222] pb-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={clsx("text-xs px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5", tab === t ? "bg-[#1a1a1a] text-[#f5f5f5]" : "text-[#555555] hover:text-[#888888]")}>
            {t === "Pending" && <Clock className="w-3 h-3" />}
            {t === "Approved" && <ShieldCheck className="w-3 h-3" />}
            {t === "Rejected" && <ShieldX className="w-3 h-3" />}
            {t} <span className="text-[10px]">({items.filter((i) => i.status === t).length})</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#555555] text-sm">No {tab.toLowerCase()} approvals</div>
        )}
        {filtered.map((item) => (
          <div key={item.id} className="bg-[#111111] border border-[#222222] rounded-md p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] text-[#f5f5f5] font-medium">{item.action}</span>
                <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm font-medium", PRIORITY_COLORS[item.priority])}>{item.priority}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#555555]">by {item.requester}</span>
                <span className="text-[11px] text-[#555555]">{formatTime(item.timestamp)}</span>
              </div>
            </div>
            {item.status === "Pending" && (
              <div className="flex gap-2 ml-4">
                <button onClick={() => setConfirm({ id: item.id, action: "approve" })} className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs rounded-md px-3 py-1.5 transition-colors">
                  <ShieldCheck className="w-3 h-3" /> Approve
                </button>
                <button onClick={() => setConfirm({ id: item.id, action: "reject" })} className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-md px-3 py-1.5 transition-colors">
                  <ShieldX className="w-3 h-3" /> Reject
                </button>
              </div>
            )}
            {item.status === "Approved" && <span className="text-emerald-400 text-xs flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Approved</span>}
            {item.status === "Rejected" && <span className="text-red-400 text-xs flex items-center gap-1"><ShieldX className="w-3.5 h-3.5" /> Rejected</span>}
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      {confirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#111111] border border-[#222222] rounded-md w-80 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#f5f5f5]">
              {confirm.action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </h2>
            <p className="text-[13px] text-[#888888]">
              Are you sure you want to {confirm.action} this request?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirm(null)} className="bg-[#222222] hover:bg-[#2a2a2a] text-[#ccc] text-xs rounded-md px-3 py-1.5 transition-colors">Cancel</button>
              <button onClick={() => handleAction(confirm.id, confirm.action === "approve" ? "Approved" : "Rejected")} className={clsx("text-white text-xs rounded-md px-3 py-1.5 transition-colors", confirm.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}>
                {confirm.action === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
