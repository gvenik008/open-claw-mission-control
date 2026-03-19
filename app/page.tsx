"use client";

import { useEffect, useState } from "react";
import { Activity, Radio, Wrench, MessageSquare, Wifi, WifiOff } from "lucide-react";
import { checkGatewayHealth, mockActivity, mockSessions } from "@/lib/api";

export default function Dashboard() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ sessions: 0, tools: 0, messages: 0 });

  useEffect(() => {
    checkGatewayHealth().then((ok) => {
      setConnected(ok);
      setStats((s) => ({ ...s, sessions: mockSessions.length }));
    });

    try {
      const tools = JSON.parse(localStorage.getItem("mc-tools") || "[]");
      setStats((s) => ({ ...s, tools: tools.length, messages: 47 }));
    } catch {
      setStats((s) => ({ ...s, messages: 47 }));
    }
  }, []);

  const statCards = [
    {
      label: "Active Sessions",
      value: stats.sessions,
      icon: Radio,
    },
    {
      label: "Custom Tools",
      value: stats.tools,
      icon: Wrench,
    },
    {
      label: "Messages Today",
      value: stats.messages,
      icon: MessageSquare,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#555555] mt-0.5">OpenClaw Gateway</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-md">
          {connected === null ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <span className="text-xs text-[#888888]">Connecting</span>
            </>
          ) : connected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-[#888888]">Gateway online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs text-[#888888]">Gateway offline</span>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-[#111111] border border-[#222222] rounded-md p-4 hover:bg-[#1a1a1a] transition-colors duration-150"
          >
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-4 h-4 text-[#555555]" />
              <span className="text-2xl font-semibold text-[#f5f5f5] tabular-nums">{value}</span>
            </div>
            <p className="text-xs text-[#888888]">{label}</p>
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222222]">
          <Activity className="w-4 h-4 text-[#555555]" />
          <h2 className="text-sm font-medium text-[#f5f5f5]">Recent Activity</h2>
        </div>
        <div>
          {mockActivity.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors duration-150 ${
                idx < mockActivity.length - 1 ? "border-b border-[#222222]" : ""
              }`}
            >
              <span className="text-sm w-5 shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#888888] truncate">{item.message}</p>
              </div>
              <span className="text-[11px] text-[#555555] whitespace-nowrap">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#555555] mb-3">System</h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555555]">Gateway</span>
              <span className="text-xs text-[#888888] font-mono">127.0.0.1:18789</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555555]">WebSocket</span>
              <span className="text-xs text-[#888888] font-mono">ws://127.0.0.1:18789</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555555]">Runtime</span>
              <span className="text-xs text-[#888888] font-mono">Node v22.22.1</span>
            </div>
          </div>
        </div>
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#555555] mb-3">Agent</h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555555]">Model</span>
              <span className="text-xs text-[#888888] font-mono">claude-opus-4-6</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555555]">Channel</span>
              <span className="text-xs text-[#888888] font-mono">webchat</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555555]">OS</span>
              <span className="text-xs text-[#888888] font-mono">Darwin 25.3.0 (x64)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
