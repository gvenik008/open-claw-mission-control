"use client";

import { useEffect, useState } from "react";
import { Radio, ChevronRight, ArrowLeft, MessageSquare, RefreshCw } from "lucide-react";
import { fetchGateway, mockSessions } from "@/lib/api";
import clsx from "clsx";

interface Session {
  id: string;
  name: string;
  channel: string;
  lastActive: string;
  status: string;
  messages?: { role: string; content: string; timestamp: string }[];
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Session | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    const data = await fetchGateway("/api/sessions");
    if (data && Array.isArray(data)) {
      setSessions(data);
    } else {
      setSessions(mockSessions);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const diff = Date.now() - d.getTime();
      if (diff < 60000) return "just now";
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return d.toLocaleDateString();
    } catch {
      return iso;
    }
  };

  const channelBadge = (channel: string) => {
    return "bg-[#222222] text-[#888888]";
  };

  const statusDot: Record<string, string> = {
    active: "bg-emerald-500",
    idle: "bg-yellow-500",
    closed: "bg-[#444444]",
  };

  if (selected) {
    return (
      <div className="max-w-5xl mx-auto space-y-5">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-[13px] text-[#555555] hover:text-[#f5f5f5] transition-colors duration-150"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sessions
        </button>

        <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
          {/* Detail header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#222222]">
            <Radio className="w-4 h-4 text-[#5e6ad2]" />
            <div>
              <h2 className="text-[13px] font-medium text-[#f5f5f5]">{selected.name}</h2>
              <p className="text-[11px] text-[#555555] mt-0.5">
                {selected.channel} · {formatTime(selected.lastActive)}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="p-4 space-y-2">
            {(selected.messages || []).length === 0 ? (
              <p className="text-sm text-[#555555] text-center py-10">No messages in this session</p>
            ) : (
              (selected.messages || []).map((msg, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    "rounded-md p-3 text-[13px]",
                    msg.role === "user"
                      ? "bg-[#1a1a1a] border border-[#2a2a2a] ml-8"
                      : msg.role === "assistant"
                      ? "bg-[#1a1a1a] border border-[#222222] mr-8"
                      : "bg-[#111111] border border-[#222222]"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={clsx(
                        "text-[10px] uppercase tracking-wider font-medium",
                        msg.role === "user"
                          ? "text-[#5e6ad2]"
                          : msg.role === "assistant"
                          ? "text-[#888888]"
                          : "text-[#555555]"
                      )}
                    >
                      {msg.role}
                    </span>
                    <span className="text-[10px] text-[#555555]">{formatTime(msg.timestamp)}</span>
                  </div>
                  <p className="text-[#888888] leading-relaxed">{msg.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Sessions</h1>
          <p className="text-sm text-[#555555] mt-0.5">Active gateway sessions</p>
        </div>
        <button
          onClick={loadSessions}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-md text-xs text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors duration-150"
        >
          <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Sessions Table */}
      <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_16px] gap-4 px-4 py-2.5 border-b border-[#222222]">
          <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium">Session</p>
          <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium">Channel</p>
          <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium">Last active</p>
          <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium">Status</p>
          <span />
        </div>

        {sessions.length === 0 && !loading ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-[#555555]">No sessions found</p>
          </div>
        ) : (
          sessions.map((session, idx) => (
            <div
              key={session.id}
              onClick={() => setSelected(session)}
              className={clsx(
                "grid grid-cols-[1fr_auto_auto_auto_16px] gap-4 px-4 py-3 items-center cursor-pointer hover:bg-[#1a1a1a] transition-colors duration-150",
                idx < sessions.length - 1 ? "border-b border-[#222222]" : ""
              )}
            >
              {/* Session name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <MessageSquare className="w-3.5 h-3.5 text-[#555555] shrink-0" />
                <span className="text-[13px] text-[#f5f5f5] font-mono truncate">{session.name}</span>
              </div>

              {/* Channel badge */}
              <span className={clsx("text-[10px] px-2 py-0.5 rounded-sm font-medium", channelBadge(session.channel))}>
                {session.channel}
              </span>

              {/* Last active */}
              <span className="text-[11px] text-[#555555] whitespace-nowrap">{formatTime(session.lastActive)}</span>

              {/* Status */}
              <div className="flex items-center gap-1.5">
                <div
                  className={clsx(
                    "w-1.5 h-1.5 rounded-full",
                    statusDot[session.status] || "bg-[#444444]",
                    session.status === "active" && "animate-pulse"
                  )}
                />
                <span className="text-[11px] text-[#555555]">{session.status}</span>
              </div>

              {/* Chevron */}
              <ChevronRight className="w-3.5 h-3.5 text-[#444444]" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
