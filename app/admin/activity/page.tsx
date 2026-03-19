"use client";

import { useState, useEffect } from "react";
import { Activity, RefreshCw } from "lucide-react";
import clsx from "clsx";

export default function ActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [instances, setInstances] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/instances").then(r => r.json()).then((data: any[]) => {
      const map: Record<string, string> = {};
      data.forEach(i => { map[i.id] = i.display_name || i.username; });
      setInstances(map);
    }).catch(() => {});
    fetch("/api/admin/activity").then(r => r.json()).then(setActivities).catch(() => []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Activity Log</h1>
          <p className="text-sm text-[#555555] mt-0.5">All actions across all instances</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] bg-[#1a1a1a] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] transition-all">
          <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
        </button>
      </div>

      <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden divide-y divide-[#1a1a1a]">
        {activities.map((a: any) => (
          <div key={a.id} className="px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
            <div className="flex items-center gap-2 mb-0.5">
              <Activity className="w-3 h-3 text-[#555555]" />
              <span className="text-[12px] font-medium text-[#f5f5f5]">{a.action.replace(/_/g, " ")}</span>
              {a.instance_id && instances[a.instance_id] && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#1a1a1a] text-[#888888]">{instances[a.instance_id]}</span>
              )}
            </div>
            <p className="text-[11px] text-[#888888] ml-5">{a.detail}</p>
            <p className="text-[9px] text-[#444444] ml-5 mt-0.5">{a.created_at}</p>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-[#555555]">No activity yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
