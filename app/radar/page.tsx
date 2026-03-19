"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";

type SignalType = "Alert" | "Insight" | "Report" | "Web";

interface Signal {
  id: string;
  type: SignalType;
  title: string;
  summary: string;
  timestamp: string;
}

const TYPE_CONFIG: Record<SignalType, { icon: string; color: string }> = {
  Alert: { icon: "🔔", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  Insight: { icon: "💡", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  Report: { icon: "📊", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  Web: { icon: "🌐", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
};

const INITIAL_SIGNALS: Signal[] = [
  { id: "s1", type: "Alert", title: "New message from Telegram", summary: "Incoming message received on the Telegram channel from @SM_0_0_8", timestamp: "2026-03-18T21:15:00" },
  { id: "s2", type: "Report", title: "Gateway uptime: 6h 42m", summary: "Gateway has been running stable with 0 restarts in the current session", timestamp: "2026-03-18T21:10:00" },
  { id: "s3", type: "Insight", title: "Memory updated", summary: "Daily memory file updated with 12 new entries from today's sessions", timestamp: "2026-03-18T21:05:00" },
  { id: "s4", type: "Web", title: "Trending: AI Agent frameworks", summary: "Spike in interest for autonomous AI agent toolkits across developer communities", timestamp: "2026-03-18T20:45:00" },
  { id: "s5", type: "Alert", title: "Token usage at 85%", summary: "Daily token consumption approaching the configured soft limit threshold", timestamp: "2026-03-18T20:30:00" },
  { id: "s6", type: "Insight", title: "Peak activity detected", summary: "Session activity peaked between 19:00-21:00 with 8 tool invocations per minute", timestamp: "2026-03-18T20:15:00" },
  { id: "s7", type: "Report", title: "Build successful", summary: "Mission Control app compiled successfully with 0 errors and 0 warnings", timestamp: "2026-03-18T20:00:00" },
  { id: "s8", type: "Web", title: "OpenClaw mentioned on HN", summary: "Thread discussing OpenClaw architecture received 47 upvotes on Hacker News", timestamp: "2026-03-18T19:30:00" },
  { id: "s9", type: "Insight", title: "Skill usage pattern", summary: "Weather skill called 3x more frequently on weekends vs weekdays", timestamp: "2026-03-18T19:00:00" },
  { id: "s10", type: "Alert", title: "Disk space warning", summary: "Workspace directory approaching 80% of allocated storage capacity", timestamp: "2026-03-18T18:30:00" },
];

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function RadarPage() {
  const [signals, setSignals] = useState(INITIAL_SIGNALS);
  const [filter, setFilter] = useState<SignalType | "All">("All");
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setScanning(true);
      setTimeout(() => setScanning(false), 2000);
    }, 30000);
    const timeout = setTimeout(() => setScanning(false), 2000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  const filtered = filter === "All" ? signals : signals.filter((s) => s.type === filter);
  const types: (SignalType | "All")[] = ["All", "Alert", "Insight", "Report", "Web"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight flex items-center gap-2">
            Radar
            {scanning && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </span>
            )}
          </h1>
          <p className="text-sm text-[#555555] mt-0.5">
            {scanning ? "Scanning for signals..." : "Intelligence feed & monitoring"}
          </p>
        </div>
        {/* Radar sweep animation */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border border-cyan-500/20" />
          <div className="absolute inset-2 rounded-full border border-cyan-500/10" />
          <div className="absolute inset-4 rounded-full border border-cyan-500/5" />
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className={clsx("absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-cyan-500 to-transparent origin-left", scanning && "animate-spin")} style={{ animationDuration: "2s" }} />
          </div>
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500" />
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 border-b border-[#222222] pb-2">
        {types.map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={clsx("text-xs px-3 py-1.5 rounded-md transition-colors", filter === t ? "bg-[#1a1a1a] text-[#f5f5f5]" : "text-[#555555] hover:text-[#888888]")}>
            {t !== "All" && TYPE_CONFIG[t as SignalType].icon} {t}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-2">
        {filtered.map((signal) => (
          <div key={signal.id} className={clsx("bg-[#111111] border rounded-md p-4 hover:bg-[#1a1a1a] transition-colors", TYPE_CONFIG[signal.type].color.split(" ").find((c) => c.startsWith("border-")) || "border-[#222222]")}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-lg">{TYPE_CONFIG[signal.type].icon}</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[13px] text-[#f5f5f5] font-medium">{signal.title}</h3>
                    <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm font-medium", TYPE_CONFIG[signal.type].color)}>{signal.type}</span>
                  </div>
                  <p className="text-[11px] text-[#555555]">{signal.summary}</p>
                </div>
              </div>
              <span className="text-[10px] text-[#555555] whitespace-nowrap ml-3">{timeAgo(signal.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
