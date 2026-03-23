"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { Server, Users, Sparkles, Wrench, Activity, RefreshCw } from "lucide-react";

interface Instance { id: string; username: string; display_name: string; gateway_port: number; mc_port: number; status: string; gwAlive: boolean; mcAlive: boolean; created_at: string; }
interface ActivityItem { id: string; instance_id: string; action: string; detail: string; created_at: string; }

export default function Dashboard() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/instances").then(r => r.json()),
      fetch("/api/admin/shared-skills").then(r => r.json()),
      fetch("/api/admin/shared-tools").then(r => r.json()),
    ]).then(([inst, skills, tools]) => {
      setInstances(inst);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const running = instances.filter(i => i.gwAlive);
  const total = instances.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Master Control</h1>
          <p className="text-sm text-[#555555] mt-0.5">Superadmin dashboard — manage all OpenClaw instances</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] bg-[#1a1a1a] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] transition-all">
          <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: "Total Instances", value: total, icon: Server, color: "#5e6ad2" },
          { label: "Running", value: running.length, icon: Activity, color: "#10b981" },
          { label: "Stopped", value: total - running.length, icon: Server, color: "#ef4444" },
          { label: "Shared Skills", value: "46", icon: Sparkles, color: "#f59e0b" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#111111] border border-[#222222] rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-2xl font-semibold text-[#f5f5f5]">{value}</span>
            </div>
            <p className="text-xs text-[#888888]">{label}</p>
          </div>
        ))}
      </div>

      {/* Instance Cards */}
      <div>
        <h2 className="text-sm font-medium text-[#888888] uppercase tracking-wider mb-3">Instances</h2>
        {instances.length === 0 && !loading && (
          <div className="bg-[#111111] border border-[#222222] rounded-md p-8 text-center">
            <Server className="w-8 h-8 text-[#333333] mx-auto mb-3" />
            <p className="text-[13px] text-[#555555]">No instances yet. Provision your first user.</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {instances.map((inst) => (
            <a key={inst.id} href={`/admin/instances?id=${inst.id}`}
              className="bg-[#111111] border border-[#222222] rounded-md p-4 hover:border-[#333333] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={clsx("w-2 h-2 rounded-full", inst.gwAlive ? "bg-emerald-500" : "bg-red-500")} />
                  <span className="text-[14px] font-medium text-[#f5f5f5]">{inst.display_name || inst.username}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#1a1a1a] text-[#888888]">{inst.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[#555555]">Gateway</span>
                  <span className={clsx("ml-1", inst.gwAlive ? "text-emerald-400" : "text-red-400")}>
                    :{inst.gateway_port} {inst.gwAlive ? "●" : "○"}
                  </span>
                </div>
                <div>
                  <span className="text-[#555555]">MC</span>
                  <span className={clsx("ml-1", inst.mcAlive ? "text-emerald-400" : "text-red-400")}>
                    :{inst.mc_port} {inst.mcAlive ? "●" : "○"}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
