"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Settings, Cpu, Bell, Database, HardDrive, Server, Info, CheckCircle, XCircle } from "lucide-react";

interface DBStats {
  agents: number;
  tasks: number;
  activities: number;
  memories: number;
  sessions: number;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1a1a1a] last:border-0">
      <span className="text-[13px] text-[#888888]">{label}</span>
      <span className="text-[13px] text-[#f5f5f5] font-mono">{value}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-[#111111] border border-[#222222] rounded-md p-5">
      <h2 className="text-[13px] font-medium text-[#f5f5f5] mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#5e6ad2]" />
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [dbStats, setDbStats] = useState<DBStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/metrics");
      const data = await res.json();
      const summary = data.summary || {};

      // Get sessions count separately
      const sessRes = await fetch("/api/sessions");
      const sessData = await sessRes.json();

      setDbStats({
        agents: summary.totalAgents || 0,
        tasks: summary.totalTasks || 0,
        activities: data.activityTypes?.reduce((s: number, a: any) => s + a.count, 0) || 0,
        memories: 0,
        sessions: (sessData.sessions || []).length,
      });
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const workspacePath = typeof window !== "undefined" ? "~/.openclaw/workspace" : "~/.openclaw/workspace";
  const instanceName = "Mission Control";
  const version = "1.0.0";

  const hasTelegram = true; // Always show as configured since we have it

  return (
    <div className="p-6 min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Settings</h1>
          <p className="text-sm text-[#555555] mt-0.5">Mission Control configuration and system info</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-md text-[13px] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* General */}
        <SectionCard title="General" icon={Info}>
          <StatRow label="Instance Name" value={instanceName} />
          <StatRow label="Version" value={version} />
          <StatRow label="Workspace Path" value={workspacePath} />
          <StatRow label="Environment" value="production" />
          <div className="mt-3 p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-md">
            <p className="text-[11px] text-[#555555]">
              Settings are read-only. To modify configuration, edit the gateway config at{" "}
              <code className="text-[#5e6ad2]">~/.openclaw/config.yaml</code>.
            </p>
          </div>
        </SectionCard>

        {/* Agents */}
        <SectionCard title="Agent Defaults" icon={Cpu}>
          <StatRow label="Default Model" value="anthropic/claude-sonnet-4-6" />
          <StatRow label="Default Timeout" value="600s (10 min)" />
          <StatRow label="Browser Timeout" value="900s (15 min)" />
          <StatRow label="Max Task Timeout" value="1200s (20 min)" />
          <div className="flex items-center justify-between py-2.5 border-b border-[#1a1a1a]">
            <span className="text-[13px] text-[#888888]">Auto-training</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-[13px]">Enabled</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-[13px] text-[#888888]">Skill Auto-assignment</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-[13px]">Enabled</span>
            </div>
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard title="Notifications" icon={Bell}>
          <div className="flex items-center justify-between py-2.5 border-b border-[#1a1a1a]">
            <span className="text-[13px] text-[#888888]">Telegram Bot</span>
            <div className={`flex items-center gap-1.5 ${hasTelegram ? "text-emerald-400" : "text-[#555555]"}`}>
              {hasTelegram ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              <span className="text-[13px]">{hasTelegram ? "Connected" : "Not configured"}</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-[#1a1a1a]">
            <span className="text-[13px] text-[#888888]">Alert on task complete</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-[13px]">On</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-[#1a1a1a]">
            <span className="text-[13px] text-[#888888]">Alert on error</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-[13px]">On</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-[13px] text-[#888888]">Heartbeat interval</span>
            <span className="text-[13px] text-[#f5f5f5] font-mono">~30 min</span>
          </div>
        </SectionCard>

        {/* System */}
        <SectionCard title="System" icon={Database}>
          {loading ? (
            <div className="flex items-center gap-2 text-[#555555] py-4">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-[13px]">Loading stats...</span>
            </div>
          ) : dbStats ? (
            <>
              <StatRow label="Active Agents" value={dbStats.agents} />
              <StatRow label="Total Tasks" value={dbStats.tasks} />
              <StatRow label="Total Activities" value={dbStats.activities.toLocaleString()} />
              <StatRow label="Sessions (DB)" value={dbStats.sessions} />
              <div className="mt-3 flex items-center gap-3 text-[11px] text-[#555555]">
                <Server className="w-3.5 h-3.5" />
                <span>Database: SQLite (better-sqlite3) · WAL mode</span>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-[#555555]">Failed to load stats</p>
          )}
        </SectionCard>

        {/* Storage */}
        <SectionCard title="Storage" icon={HardDrive}>
          <StatRow label="Database" value="data/mission-control.db" />
          <StatRow label="Reports" value="reports/" />
          <StatRow label="Skills" value="~/.openclaw/workspace/skills/" />
          <StatRow label="Agent Workspaces" value="~/.openclaw/workspace-{agent_id}/" />
          <div className="mt-3 p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-md">
            <p className="text-[11px] text-[#555555]">
              Data is stored locally on the host machine. Reports are saved as Markdown files in the reports directory.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
