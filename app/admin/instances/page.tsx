"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { Server, Play, Square, RefreshCw, ExternalLink, Loader2 } from "lucide-react";

interface Instance {
  id: string; username: string; display_name: string; telegram_id: string;
  gateway_port: number; mc_port: number; status: string;
  gwAlive: boolean; mcAlive: boolean; openclaw_dir: string; workspace_dir: string;
  created_at: string; updated_at: string;
}

export default function InstancesPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/instances").then(r => r.json()).then(data => {
      setInstances(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const doAction = async (id: string, action: "start" | "stop") => {
    setActionLoading(id);
    await fetch("/api/admin/instances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setTimeout(load, 2000); // wait for services to start/stop
    setActionLoading(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Instances</h1>
          <p className="text-sm text-[#555555] mt-0.5">{instances.length} registered instance{instances.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] bg-[#1a1a1a] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] transition-all">
          <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
        </button>
      </div>

      <div className="space-y-3">
        {instances.map((inst) => (
          <div key={inst.id} className="bg-[#111111] border border-[#222222] rounded-md p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  inst.gwAlive ? "bg-emerald-500/15 text-emerald-400" : "bg-[#1a1a1a] text-[#555555]"
                )}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#f5f5f5]">{inst.display_name || inst.username}</h3>
                  <p className="text-[11px] text-[#555555] font-mono">@{inst.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
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

            {/* Status Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatusItem label="Gateway" port={inst.gateway_port} alive={inst.gwAlive} />
              <StatusItem label="Mission Control" port={inst.mc_port} alive={inst.mcAlive} />
              <div>
                <span className="text-[10px] text-[#555555]">Telegram ID</span>
                <p className="text-[12px] text-[#f5f5f5] font-mono">{inst.telegram_id || "—"}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#555555]">Created</span>
                <p className="text-[12px] text-[#f5f5f5]">{inst.created_at?.split(" ")[0] || "—"}</p>
              </div>
            </div>

            {/* Paths */}
            <div className="mt-3 flex gap-4">
              <div>
                <span className="text-[10px] text-[#555555]">Config</span>
                <p className="text-[10px] text-[#888888] font-mono">{inst.openclaw_dir}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#555555]">Workspace</span>
                <p className="text-[10px] text-[#888888] font-mono">{inst.workspace_dir}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {instances.length === 0 && !loading && (
        <div className="bg-[#111111] border border-[#222222] rounded-md p-12 text-center">
          <Server className="w-10 h-10 text-[#333333] mx-auto mb-3" />
          <p className="text-[14px] font-medium text-[#f5f5f5] mb-1">No instances</p>
          <p className="text-[12px] text-[#555555]">Use the provisioning script to create a new user instance.</p>
          <code className="block mt-3 text-[11px] text-[#5e6ad2] bg-[#0a0a0a] rounded-md px-4 py-2 font-mono">
            npx tsx scripts/provision.ts --username alice --telegram-id ID --bot-token TOKEN --api-key KEY
          </code>
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
