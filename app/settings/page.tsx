"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Settings, Cpu, Bell, Database, HardDrive, Server, Info, CheckCircle, XCircle, Save, Loader2, AlertTriangle, Trash2 } from "lucide-react";

interface SettingsData {
  general: { instanceName: string; version: string };
  agents: { defaultModel: string; defaultTimeout: number; autoTraining: boolean };
  notifications: { telegramEnabled: boolean; onTaskComplete: boolean; onError: boolean };
}

interface Stats {
  agents: number;
  tasks: number;
  activities: number;
  memories: number;
  skills: number;
  tools: number;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        value ? "bg-[#5e6ad2]" : "bg-[#333333]"
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        value ? "translate-x-4" : "translate-x-0.5"
      }`} />
    </button>
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

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1a1a1a] last:border-0">
      <span className="text-[13px] text-[#888888]">{label}</span>
      <span className="text-[13px] text-[#f5f5f5] font-mono">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [clearingData, setClearingData] = useState(false);

  // Section-specific saving state
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Local edit state per section
  const [generalForm, setGeneralForm] = useState({ instanceName: "" });
  const [agentForm, setAgentForm] = useState({ defaultModel: "", defaultTimeout: 600, autoTraining: true });
  const [notifForm, setNotifForm] = useState({ telegramEnabled: true, onTaskComplete: true, onError: true });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data.settings);
      setStats(data.stats);

      // Initialize form state
      setGeneralForm({ instanceName: data.settings.general?.instanceName || "" });
      setAgentForm({
        defaultModel: data.settings.agents?.defaultModel || "anthropic/claude-sonnet-4-6",
        defaultTimeout: data.settings.agents?.defaultTimeout || 600,
        autoTraining: data.settings.agents?.autoTraining ?? true,
      });
      setNotifForm({
        telegramEnabled: data.settings.notifications?.telegramEnabled ?? true,
        onTaskComplete: data.settings.notifications?.onTaskComplete ?? true,
        onError: data.settings.notifications?.onError ?? true,
      });
    } catch {
      showToast("Failed to load settings", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSection(section: string, data: any) {
    setSavingSection(section);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [section]: data }),
      });
      if (res.ok) {
        showToast("Settings saved", "success");
        await load();
      } else {
        showToast("Failed to save", "error");
      }
    } catch {
      showToast("Failed to save", "error");
    }
    setSavingSection(null);
  }

  async function clearTestData() {
    setClearingData(true);
    try {
      const res = await fetch("/api/settings", { method: "DELETE" });
      if (res.ok) {
        showToast("Test data cleared", "success");
        await load();
      } else {
        showToast("Failed to clear data", "error");
      }
    } catch {
      showToast("Failed to clear data", "error");
    }
    setClearingData(false);
  }

  const workspacePath = "~/.openclaw/workspace";

  return (
    <div className="p-6 min-h-screen bg-[#0a0a0a]">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium shadow-lg transition-all ${
          toast.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
            : "bg-red-500/10 border border-red-500/30 text-red-400"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

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

      {loading && !settings ? (
        <div className="flex items-center gap-2 text-[#555555] py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[13px]">Loading settings...</span>
        </div>
      ) : (
        <div className="max-w-2xl space-y-5">
          {/* General */}
          <SectionCard title="General" icon={Info}>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1.5">Instance Name</label>
                <input
                  value={generalForm.instanceName}
                  onChange={(e) => setGeneralForm({ ...generalForm, instanceName: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                />
              </div>
              <StatRow label="Version" value={settings?.general?.version || "0.1.0"} />
              <StatRow label="Workspace Path" value={workspacePath} />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => saveSection("general", generalForm)}
                disabled={savingSection === "general"}
                className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium disabled:opacity-50"
              >
                {savingSection === "general" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </button>
            </div>
          </SectionCard>

          {/* Agent Defaults */}
          <SectionCard title="Agent Defaults" icon={Cpu}>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1.5">Default Model</label>
                <select
                  value={agentForm.defaultModel}
                  onChange={(e) => setAgentForm({ ...agentForm, defaultModel: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                >
                  <option value="anthropic/claude-sonnet-4-6">claude-sonnet-4-6</option>
                  <option value="anthropic/claude-opus-4-6">claude-opus-4-6</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1.5">Default Timeout (seconds)</label>
                <input
                  type="number"
                  value={agentForm.defaultTimeout}
                  onChange={(e) => setAgentForm({ ...agentForm, defaultTimeout: parseInt(e.target.value) || 600 })}
                  min={60}
                  max={3600}
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2] transition-colors"
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-[13px] text-[#888888]">Auto-training</p>
                  <p className="text-[11px] text-[#555555]">Automatically train agents on task completion</p>
                </div>
                <Toggle value={agentForm.autoTraining} onChange={(v) => setAgentForm({ ...agentForm, autoTraining: v })} />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => saveSection("agents", agentForm)}
                disabled={savingSection === "agents"}
                className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium disabled:opacity-50"
              >
                {savingSection === "agents" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </button>
            </div>
          </SectionCard>

          {/* Notifications */}
          <SectionCard title="Notifications" icon={Bell}>
            <div className="space-y-3 mb-4">
              {[
                { key: "telegramEnabled" as const, label: "Telegram Bot", desc: "Send notifications via Telegram" },
                { key: "onTaskComplete" as const, label: "On Task Complete", desc: "Alert when a task finishes" },
                { key: "onError" as const, label: "On Error", desc: "Alert when an agent encounters an error" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-1 border-b border-[#1a1a1a] last:border-0">
                  <div>
                    <p className="text-[13px] text-[#888888]">{label}</p>
                    <p className="text-[11px] text-[#555555]">{desc}</p>
                  </div>
                  <Toggle
                    value={notifForm[key]}
                    onChange={(v) => setNotifForm({ ...notifForm, [key]: v })}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => saveSection("notifications", notifForm)}
                disabled={savingSection === "notifications"}
                className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium disabled:opacity-50"
              >
                {savingSection === "notifications" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </button>
            </div>
          </SectionCard>

          {/* System Stats */}
          <SectionCard title="System Stats" icon={Database}>
            {stats ? (
              <>
                <StatRow label="Active Agents" value={stats.agents} />
                <StatRow label="Total Tasks" value={stats.tasks} />
                <StatRow label="Activities" value={stats.activities.toLocaleString()} />
                <StatRow label="Memories" value={stats.memories} />
                <StatRow label="Skills" value={stats.skills} />
                <StatRow label="Tools" value={stats.tools} />
                <div className="mt-3 flex items-center gap-3 text-[11px] text-[#555555]">
                  <Server className="w-3.5 h-3.5" />
                  <span>SQLite (better-sqlite3) · WAL mode</span>
                </div>
              </>
            ) : (
              <p className="text-[13px] text-[#555555] py-2">No stats available</p>
            )}
          </SectionCard>

          {/* Storage */}
          <SectionCard title="Storage" icon={HardDrive}>
            <StatRow label="Database" value="data/mission-control.db" />
            <StatRow label="Reports" value="reports/" />
            <StatRow label="Settings" value="data/settings.json" />
            <StatRow label="Agent Workspaces" value="~/.openclaw/workspace-{id}/" />
          </SectionCard>

          {/* Danger Zone */}
          <div className="bg-[#111111] border border-red-500/20 rounded-md p-5">
            <h2 className="text-[13px] font-medium text-red-400 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone
            </h2>
            <p className="text-[11px] text-[#555555] mb-4">These actions cannot be undone.</p>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-[13px] text-[#888888]">Clear Test Data</p>
                <p className="text-[11px] text-[#555555]">Delete retired agents and activities older than 7 days</p>
              </div>
              <button
                onClick={clearTestData}
                disabled={clearingData}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                {clearingData ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Clear Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
