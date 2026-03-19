"use client";

import { useState, useEffect } from "react";
import { Activity, Server, Cpu, MessageSquare, ScrollText, RefreshCw } from "lucide-react";
import clsx from "clsx";

const MOCK_LOGS = [
  "[2026-03-18 21:00:01] INFO  Gateway started on port 18789",
  "[2026-03-18 21:00:02] INFO  Loaded 3 plugins: telegram, webchat, device-pair",
  "[2026-03-18 21:00:03] INFO  Telegram bot connected successfully",
  "[2026-03-18 21:00:05] INFO  Webchat server ready on /chat",
  "[2026-03-18 21:01:12] INFO  New session: agent:main:main",
  "[2026-03-18 21:02:30] WARN  Token usage approaching limit (85%)",
  "[2026-03-18 21:03:45] INFO  Memory file updated: memory/2026-03-18.md",
  "[2026-03-18 21:04:01] INFO  Heartbeat check completed",
  "[2026-03-18 21:05:22] INFO  Tool execution: web_search completed in 1.2s",
  "[2026-03-18 21:06:10] INFO  Session keepalive ping",
  "[2026-03-18 21:07:00] WARN  Rate limit warning: 45/60 requests used",
  "[2026-03-18 21:08:15] INFO  Subagent spawned: skill-builder",
  "[2026-03-18 21:09:30] INFO  File write: mission-control/app/content/page.tsx",
  "[2026-03-18 21:10:00] INFO  Build triggered by hot-reload",
  "[2026-03-18 21:10:45] INFO  Compilation successful",
  "[2026-03-18 21:11:22] INFO  Gateway health check: OK",
  "[2026-03-18 21:12:00] ERROR Connection timeout to external API",
  "[2026-03-18 21:12:05] INFO  Retry succeeded after 1 attempt",
  "[2026-03-18 21:13:30] INFO  Memory compaction triggered",
  "[2026-03-18 21:14:00] INFO  Active sessions: 2",
];

interface Channel {
  name: string;
  status: "Running" | "Stopped";
  type: string;
}

const CHANNELS: Channel[] = [
  { name: "Telegram", status: "Running", type: "Messaging" },
  { name: "Webchat", status: "Running", type: "Web Interface" },
];

export default function SystemPage() {
  const [logs, setLogs] = useState(MOCK_LOGS);
  const [lastPing, setLastPing] = useState("2s ago");

  useEffect(() => {
    const interval = setInterval(() => {
      setLastPing(() => {
        const s = Math.floor(Math.random() * 5) + 1;
        return `${s}s ago`;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  function refreshLogs() {
    const newLog = `[2026-03-18 ${new Date().toTimeString().slice(0, 8)}] INFO  Logs refreshed`;
    setLogs((prev) => [...prev.slice(1), newLog]);
  }

  function logColor(line: string) {
    if (line.includes("ERROR")) return "text-red-400";
    if (line.includes("WARN")) return "text-yellow-400";
    return "text-cyan-400/70";
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">System</h1>
        <p className="text-sm text-[#555555] mt-0.5">Gateway health, model config & system status</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Gateway Health */}
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-medium text-[#f5f5f5]">Gateway Health</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-[11px] text-[#555555]">Endpoint</span><span className="text-[11px] text-cyan-400 font-mono">http://127.0.0.1:18789</span></div>
            <div className="flex justify-between"><span className="text-[11px] text-[#555555]">Status</span><span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-400">Healthy</span></div>
            <div className="flex justify-between"><span className="text-[11px] text-[#555555]">Last Ping</span><span className="text-[11px] text-[#f5f5f5]">{lastPing}</span></div>
            <div className="flex justify-between"><span className="text-[11px] text-[#555555]">Token</span><span className="text-[11px] text-[#f5f5f5] font-mono">oc_••••••••••••</span></div>
          </div>
        </div>

        {/* Model Configuration */}
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-medium text-[#f5f5f5]">Model Configuration</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-[11px] text-[#555555]">Model</span><span className="text-[11px] text-[#f5f5f5] font-mono">claude-opus-4-6</span></div>
            <div className="flex justify-between"><span className="text-[11px] text-[#555555]">Provider</span><span className="text-[11px] text-[#f5f5f5]">Anthropic</span></div>
            <div className="flex justify-between"><span className="text-[11px] text-[#555555]">Tokens Today</span><span className="text-[11px] text-[#f5f5f5]">127,450</span></div>
            <div className="flex justify-between"><span className="text-[11px] text-[#555555]">Sessions Today</span><span className="text-[11px] text-[#f5f5f5]">14</span></div>
            <div className="flex justify-between"><span className="text-[11px] text-[#555555]">Avg Response</span><span className="text-[11px] text-[#f5f5f5]">2.3s</span></div>
          </div>
        </div>
      </div>

      {/* Channel Status */}
      <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-medium text-[#f5f5f5]">Channels</h2>
        </div>
        <div className="space-y-2">
          {CHANNELS.map((ch) => (
            <div key={ch.name} className="flex items-center justify-between bg-[#0a0a0a] rounded-md px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className={clsx("w-2 h-2 rounded-full", ch.status === "Running" ? "bg-emerald-500" : "bg-red-500")} />
                <span className="text-[13px] text-[#f5f5f5]">{ch.name}</span>
                <span className="text-[10px] text-[#555555]">{ch.type}</span>
              </div>
              <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm", ch.status === "Running" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>{ch.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-medium text-[#f5f5f5]">System Info</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Node.js", value: "v22.22.1" },
            { label: "OpenClaw", value: "v0.1.0" },
            { label: "OS", value: "Darwin 25.3.0" },
            { label: "Uptime", value: "6h 42m" },
          ].map((item) => (
            <div key={item.label} className="bg-[#0a0a0a] rounded-md px-3 py-2">
              <p className="text-[10px] text-[#555555] uppercase tracking-wider">{item.label}</p>
              <p className="text-[13px] text-[#f5f5f5] font-mono mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Logs Viewer */}
      <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-medium text-[#f5f5f5]">Logs</h2>
          </div>
          <button onClick={refreshLogs} className="flex items-center gap-1 text-[11px] text-[#555555] hover:text-[#888888] transition-colors">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        <div className="bg-[#0a0a0a] rounded-md p-3 max-h-64 overflow-y-auto font-mono text-[11px] space-y-0.5">
          {logs.map((line, i) => (
            <div key={i} className={logColor(line)}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
