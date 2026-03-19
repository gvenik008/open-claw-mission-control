"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, ScrollText, Send, RefreshCw, Bug, Lightbulb, HelpCircle } from "lucide-react";
import clsx from "clsx";

type FeedbackType = "Bug" | "Feature" | "Question";
type Priority = "High" | "Medium" | "Low";
type Tab = "feedback" | "logs";

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  description: string;
  priority: Priority;
  createdAt: string;
}

const TYPE_CONFIG: Record<FeedbackType, { icon: typeof Bug; color: string }> = {
  Bug: { icon: Bug, color: "bg-red-500/10 text-red-400" },
  Feature: { icon: Lightbulb, color: "bg-yellow-500/10 text-yellow-400" },
  Question: { icon: HelpCircle, color: "bg-cyan-500/10 text-cyan-400" },
};

const PRIORITY_COLORS: Record<Priority, string> = {
  High: "bg-red-500/10 text-red-400",
  Medium: "bg-orange-500/10 text-orange-400",
  Low: "bg-[#222222] text-[#888888]",
};

const MOCK_LOGS = [
  { time: "21:14:00", level: "INFO", msg: "Active sessions: 2" },
  { time: "21:13:30", level: "INFO", msg: "Memory compaction triggered" },
  { time: "21:12:05", level: "INFO", msg: "Retry succeeded after 1 attempt" },
  { time: "21:12:00", level: "ERROR", msg: "Connection timeout to external API" },
  { time: "21:11:22", level: "INFO", msg: "Gateway health check: OK" },
  { time: "21:10:45", level: "INFO", msg: "Compilation successful" },
  { time: "21:10:00", level: "INFO", msg: "Build triggered by hot-reload" },
  { time: "21:09:30", level: "INFO", msg: "File write: mission-control/app/content/page.tsx" },
  { time: "21:08:15", level: "INFO", msg: "Subagent spawned: skill-builder" },
  { time: "21:07:00", level: "WARN", msg: "Rate limit warning: 45/60 requests used" },
  { time: "21:06:10", level: "INFO", msg: "Session keepalive ping" },
  { time: "21:05:22", level: "INFO", msg: "Tool execution: web_search completed in 1.2s" },
  { time: "21:04:01", level: "INFO", msg: "Heartbeat check completed" },
  { time: "21:03:45", level: "INFO", msg: "Memory file updated: memory/2026-03-18.md" },
  { time: "21:02:30", level: "WARN", msg: "Token usage approaching limit (85%)" },
  { time: "21:01:12", level: "INFO", msg: "New session: agent:main:main" },
  { time: "21:00:05", level: "INFO", msg: "Webchat server ready on /chat" },
  { time: "21:00:03", level: "INFO", msg: "Telegram bot connected successfully" },
  { time: "21:00:02", level: "INFO", msg: "Loaded 3 plugins: telegram, webchat, device-pair" },
  { time: "21:00:01", level: "INFO", msg: "Gateway started on port 18789" },
  { time: "20:59:58", level: "INFO", msg: "Configuration loaded from ~/.openclaw/config.yaml" },
  { time: "20:59:55", level: "INFO", msg: "Node.js v22.22.1 detected" },
  { time: "20:59:50", level: "INFO", msg: "OpenClaw v0.1.0 initializing" },
  { time: "20:55:00", level: "WARN", msg: "Previous session ended unexpectedly" },
  { time: "20:50:12", level: "INFO", msg: "Workspace: ~/.openclaw/workspace" },
  { time: "20:50:10", level: "INFO", msg: "Environment: Darwin x64" },
  { time: "20:45:00", level: "ERROR", msg: "Failed to connect to Telegram (retrying...)" },
  { time: "20:44:55", level: "INFO", msg: "Loading channel plugins..." },
  { time: "20:44:50", level: "INFO", msg: "Initializing gateway service" },
  { time: "20:44:45", level: "INFO", msg: "Starting OpenClaw daemon" },
  { time: "20:40:00", level: "INFO", msg: "System ready" },
  { time: "20:39:55", level: "INFO", msg: "Skill registry loaded: 4 skills" },
  { time: "20:39:50", level: "INFO", msg: "Memory store initialized" },
  { time: "20:39:45", level: "INFO", msg: "Tool registry initialized" },
  { time: "20:35:00", level: "INFO", msg: "Database connection established" },
  { time: "20:34:55", level: "INFO", msg: "Cache layer ready" },
  { time: "20:34:50", level: "INFO", msg: "File watcher started on workspace" },
  { time: "20:30:00", level: "INFO", msg: "Health check endpoint: /health" },
  { time: "20:29:55", level: "INFO", msg: "API routes registered" },
  { time: "20:29:50", level: "INFO", msg: "Middleware chain initialized" },
  { time: "20:25:00", level: "INFO", msg: "Session store: in-memory" },
  { time: "20:24:55", level: "INFO", msg: "Rate limiter configured: 60 req/min" },
  { time: "20:24:50", level: "INFO", msg: "CORS policy applied" },
  { time: "20:20:00", level: "INFO", msg: "TLS not configured (HTTP mode)" },
  { time: "20:19:55", level: "INFO", msg: "Listening on 0.0.0.0:18789" },
  { time: "20:19:50", level: "INFO", msg: "Server bootstrap complete" },
  { time: "20:15:00", level: "INFO", msg: "Process PID: 12847" },
  { time: "20:14:55", level: "INFO", msg: "Log level: info" },
  { time: "20:14:50", level: "INFO", msg: "Timezone: Asia/Yerevan (GMT+4)" },
  { time: "20:10:00", level: "INFO", msg: "OpenClaw started successfully" },
];

export default function FeedbackPage() {
  const [tab, setTab] = useState<Tab>("feedback");
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [form, setForm] = useState({ type: "Bug" as FeedbackType, description: "", priority: "Medium" as Priority });
  const [logs] = useState(MOCK_LOGS);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mc-feedback");
      if (stored) setFeedbackItems(JSON.parse(stored));
    } catch { /* empty */ }
  }, []);

  function saveFeedback(updated: FeedbackItem[]) {
    setFeedbackItems(updated);
    localStorage.setItem("mc-feedback", JSON.stringify(updated));
  }

  function handleSubmit() {
    if (!form.description.trim()) return;
    const item: FeedbackItem = {
      id: "fb-" + Date.now(),
      type: form.type,
      description: form.description,
      priority: form.priority,
      createdAt: new Date().toISOString(),
    };
    saveFeedback([item, ...feedbackItems]);
    setForm({ type: "Bug", description: "", priority: "Medium" });
  }

  function logColor(level: string) {
    if (level === "ERROR") return "text-red-400";
    if (level === "WARN") return "text-yellow-400";
    return "text-cyan-400/70";
  }

  function scrollToBottom() {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Feedback & Logs</h1>
        <p className="text-sm text-[#555555] mt-0.5">Submit feedback and view system logs</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#222222] pb-2">
        <button onClick={() => setTab("feedback")} className={clsx("text-xs px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5", tab === "feedback" ? "bg-[#1a1a1a] text-[#f5f5f5]" : "text-[#555555] hover:text-[#888888]")}>
          <MessageSquare className="w-3 h-3" /> Feedback
        </button>
        <button onClick={() => setTab("logs")} className={clsx("text-xs px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5", tab === "logs" ? "bg-[#1a1a1a] text-[#f5f5f5]" : "text-[#555555] hover:text-[#888888]")}>
          <ScrollText className="w-3 h-3" /> Logs
        </button>
      </div>

      {/* Feedback Tab */}
      {tab === "feedback" && (
        <div className="space-y-4">
          {/* Submit Form */}
          <div className="bg-[#111111] border border-[#222222] rounded-md p-4 space-y-3">
            <h2 className="text-sm font-medium text-[#f5f5f5]">Submit Feedback</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as FeedbackType })} className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]">
                  {(["Bug", "Feature", "Question"] as FeedbackType[]).map((t) => <option key={t} value={t}>{t}</option>)}
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
              <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe your feedback..." rows={3} className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2] resize-none" />
            </div>
            <div className="flex justify-end">
              <button onClick={handleSubmit} className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors">
                <Send className="w-3.5 h-3.5" /> Submit
              </button>
            </div>
          </div>

          {/* Feedback List */}
          <div className="space-y-2">
            {feedbackItems.length === 0 && <div className="text-center py-8 text-[#555555] text-sm">No feedback submitted yet</div>}
            {feedbackItems.map((item) => {
              const Icon = TYPE_CONFIG[item.type].icon;
              return (
                <div key={item.id} className="bg-[#111111] border border-[#222222] rounded-md p-4 flex items-start gap-3">
                  <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", TYPE_CONFIG[item.type].color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm font-medium", TYPE_CONFIG[item.type].color)}>{item.type}</span>
                      <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm font-medium", PRIORITY_COLORS[item.priority])}>{item.priority}</span>
                      <span className="text-[10px] text-[#555555]">{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-[13px] text-[#888888]">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {tab === "logs" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[#555555]">Showing last 50 log lines</p>
            <button onClick={scrollToBottom} className="flex items-center gap-1 text-[11px] text-[#555555] hover:text-[#888888] transition-colors">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
          <div className="bg-[#0a0a0a] border border-[#222222] rounded-md p-3 max-h-[500px] overflow-y-auto font-mono text-[11px] space-y-0.5">
            {logs.slice(0, 50).map((log, i) => (
              <div key={i} className={logColor(log.level)}>
                <span className="text-[#555555]">[2026-03-18 {log.time}]</span>{" "}
                <span className={clsx(
                  log.level === "ERROR" ? "text-red-400 font-semibold" :
                  log.level === "WARN" ? "text-yellow-400" : "text-[#555555]"
                )}>{log.level.padEnd(5)}</span>{" "}
                {log.msg}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
