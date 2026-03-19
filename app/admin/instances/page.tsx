"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { Server, Play, Square, RefreshCw, ExternalLink, Loader2, Plus, X, Eye, ChevronDown, ChevronUp } from "lucide-react";

interface Instance {
  id: string; username: string; display_name: string; telegram_id: string;
  gateway_port: number; mc_port: number; status: string;
  gwAlive: boolean; mcAlive: boolean; openclaw_dir: string; workspace_dir: string;
  db_path: string; created_at: string;
}

export default function InstancesPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showProvision, setShowProvision] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [peekData, setPeekData] = useState<{ username: string; table: string; count: number; data: any[] } | null>(null);
  const [peekLoading, setPeekLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({ username: "", displayName: "", telegramId: "", botToken: "", apiKey: "" });

  const load = () => {
    setLoading(true);
    fetch("/api/admin/instances").then(r => r.json()).then(data => { setInstances(data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const doAction = async (id: string, action: "start" | "stop") => {
    setActionLoading(id);
    await fetch("/api/admin/instances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    setTimeout(load, 2000);
    setActionLoading(null);
  };

  const provision = async () => {
    if (!form.username || !form.botToken || !form.apiKey) return;
    setProvisioning(true);
    setProvisionResult(null);
    try {
      const res = await fetch("/api/admin/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setProvisionResult({ ok: true, msg: data.message });
        setForm({ username: "", displayName: "", telegramId: "", botToken: "", apiKey: "" });
        setTimeout(() => { load(); setShowProvision(false); setProvisionResult(null); }, 2000);
      } else {
        setProvisionResult({ ok: false, msg: data.error });
      }
    } catch (e: any) {
      setProvisionResult({ ok: false, msg: e.message });
    } finally {
      setProvisioning(false);
    }
  };

  const peek = async (username: string, table: string) => {
    setPeekLoading(true);
    try {
      const res = await fetch(`/api/admin/peek?username=${username}&table=${table}`);
      const data = await res.json();
      setPeekData(data);
    } catch {} finally { setPeekLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Instances</h1>
          <p className="text-sm text-[#555555] mt-0.5">{instances.length} registered</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] bg-[#1a1a1a] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] transition-all">
            <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
          <button onClick={() => setShowProvision(!showProvision)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white font-medium transition-all">
            <Plus className="w-3.5 h-3.5" /> New Instance
          </button>
        </div>
      </div>

      {/* Provision Form */}
      {showProvision && (
        <div className="bg-[#111111] border border-[#5e6ad2]/30 rounded-md p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[#f5f5f5]">Provision New User</h2>
            <button onClick={() => setShowProvision(false)} className="text-[#555555] hover:text-[#888888]"><X className="w-4 h-4" /></button>
          </div>

          {provisionResult && (
            <div className={clsx("p-3 rounded-md text-[13px] border", provisionResult.ok ? "bg-emerald-500/8 border-emerald-500/25 text-emerald-400" : "bg-red-500/8 border-red-500/25 text-red-400")}>
              {provisionResult.msg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">Username *</label>
              <input className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] font-mono"
                placeholder="alice" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">Display Name</label>
              <input className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2]"
                placeholder="Alice Smith" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">Telegram User ID</label>
              <input className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] font-mono"
                placeholder="123456789" value={form.telegramId} onChange={e => setForm({ ...form, telegramId: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">Telegram Bot Token *</label>
              <input className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] font-mono"
                placeholder="123456:ABC-DEF..." value={form.botToken} onChange={e => setForm({ ...form, botToken: e.target.value })} type="password" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">Anthropic API Key *</label>
            <input className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] font-mono"
              placeholder="sk-ant-..." value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} type="password" />
          </div>
          <button onClick={provision} disabled={provisioning || !form.username || !form.botToken || !form.apiKey}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white font-medium disabled:opacity-50 transition-all">
            {provisioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Provision Instance
          </button>
        </div>
      )}

      {/* Instance List */}
      <div className="space-y-3">
        {instances.map((inst) => (
          <div key={inst.id} className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center", inst.gwAlive ? "bg-emerald-500/15 text-emerald-400" : "bg-[#1a1a1a] text-[#555555]")}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#f5f5f5]">{inst.display_name || inst.username}</h3>
                    <p className="text-[11px] text-[#555555] font-mono">@{inst.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Peek button */}
                  <button onClick={() => setExpandedId(expandedId === inst.id ? null : inst.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all">
                    <Eye className="w-3 h-3" /> View Data
                    {expandedId === inst.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {inst.mcAlive && (
                    <a href={`http://localhost:${inst.mc_port}`} target="_blank"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-[#5e6ad2] hover:bg-[#5e6ad2]/10 transition-all">
                      <ExternalLink className="w-3 h-3" /> Open MC
                    </a>
                  )}
                  {inst.gwAlive ? (
                    <button onClick={() => doAction(inst.id, "stop")} disabled={actionLoading === inst.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all disabled:opacity-50">
                      {actionLoading === inst.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />} Stop
                    </button>
                  ) : (
                    <button onClick={() => doAction(inst.id, "start")} disabled={actionLoading === inst.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all disabled:opacity-50">
                      {actionLoading === inst.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Start
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatusItem label="Gateway" port={inst.gateway_port} alive={inst.gwAlive} />
                <StatusItem label="Mission Control" port={inst.mc_port} alive={inst.mcAlive} />
                <div><span className="text-[10px] text-[#555555]">Telegram ID</span><p className="text-[12px] text-[#f5f5f5] font-mono">{inst.telegram_id || "—"}</p></div>
                <div><span className="text-[10px] text-[#555555]">Created</span><p className="text-[12px] text-[#f5f5f5]">{inst.created_at?.split(" ")[0] || "—"}</p></div>
              </div>
            </div>

            {/* Expanded: peek into user data */}
            {expandedId === inst.id && (
              <div className="border-t border-[#222222] p-4 bg-[#0a0a0a]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-medium text-[#888888]">View data:</span>
                  {["agents", "tasks", "skills", "activities"].map((table) => (
                    <button key={table} onClick={() => peek(inst.username, table)}
                      className={clsx("px-2 py-0.5 rounded-md text-[11px] transition-all",
                        peekData?.table === table && peekData?.username === inst.username
                          ? "bg-[#5e6ad2]/15 text-[#5e6ad2]"
                          : "text-[#555555] hover:text-[#888888] hover:bg-[#1a1a1a]"
                      )}>
                      {table}
                    </button>
                  ))}
                  {peekLoading && <Loader2 className="w-3 h-3 animate-spin text-[#555555]" />}
                </div>

                {peekData && peekData.username === inst.username && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-[#555555]">{peekData.count} records in {peekData.table}</p>
                    <div className="max-h-[300px] overflow-y-auto space-y-1">
                      {peekData.data.map((row: any, idx: number) => (
                        <div key={idx} className="bg-[#111111] border border-[#1a1a1a] rounded-md px-3 py-2">
                          {peekData.table === "agents" && (
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[12px] font-medium text-[#f5f5f5]">{row.name}</span>
                                <span className="text-[10px] text-[#555555] font-mono ml-2">{row.agent_id}</span>
                              </div>
                              <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm", row.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>{row.status}</span>
                            </div>
                          )}
                          {peekData.table === "tasks" && (
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[12px] text-[#f5f5f5]">{row.title}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888]">{row.status}</span>
                              </div>
                              {row.assignee && <span className="text-[10px] text-[#555555]">→ {row.assignee}</span>}
                            </div>
                          )}
                          {peekData.table === "skills" && (
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] text-[#f5f5f5]">{row.name}</span>
                              <span className="text-[10px] text-[#555555]">{row.category}</span>
                            </div>
                          )}
                          {peekData.table === "activities" && (
                            <div>
                              <span className="text-[11px] text-[#888888]">{row.action}: </span>
                              <span className="text-[11px] text-[#f5f5f5]">{row.detail}</span>
                              <span className="text-[9px] text-[#444444] ml-2">{row.created_at}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {instances.length === 0 && !loading && (
        <div className="bg-[#111111] border border-[#222222] rounded-md p-12 text-center">
          <Server className="w-10 h-10 text-[#333333] mx-auto mb-3" />
          <p className="text-[14px] font-medium text-[#f5f5f5] mb-1">No instances</p>
          <p className="text-[12px] text-[#555555]">Click "New Instance" above to provision your first user.</p>
        </div>
      )}
    </div>
  );
}

function StatusItem({ label, port, alive }: { label: string; port: number; alive: boolean }) {
  return (
    <div>
      <span className="text-[10px] text-[#555555]">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className={clsx("w-1.5 h-1.5 rounded-full", alive ? "bg-emerald-500" : "bg-red-500")} />
        <span className={clsx("text-[12px] font-mono", alive ? "text-emerald-400" : "text-red-400")}>:{port}</span>
        <span className="text-[10px] text-[#555555]">{alive ? "online" : "offline"}</span>
      </div>
    </div>
  );
}
