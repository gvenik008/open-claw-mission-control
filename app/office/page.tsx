"use client";

import { useState, useEffect } from "react";
import { Monitor, Cpu, HardDrive, Terminal, FolderOpen, RotateCcw, Globe, FileText } from "lucide-react";
import clsx from "clsx";

interface ServiceInfo {
  name: string;
  port: number;
  status: "Running" | "Stopped";
}

const SERVICES: ServiceInfo[] = [
  { name: "OpenClaw Gateway", port: 18789, status: "Running" },
  { name: "Mission Control", port: 3001, status: "Running" },
];

const RECENT_FILES = [
  { name: "SOUL.md", path: "~/.openclaw/workspace/SOUL.md", modified: "2 min ago" },
  { name: "MEMORY.md", path: "~/.openclaw/workspace/MEMORY.md", modified: "15 min ago" },
  { name: "AGENTS.md", path: "~/.openclaw/workspace/AGENTS.md", modified: "1h ago" },
  { name: "memory/2026-03-18.md", path: "~/.openclaw/workspace/memory/2026-03-18.md", modified: "3h ago" },
  { name: "TOOLS.md", path: "~/.openclaw/workspace/TOOLS.md", modified: "5h ago" },
];

export default function OfficePage() {
  const [cpuUsage, setCpuUsage] = useState(42);
  const [ramUsage, setRamUsage] = useState(67);

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage((prev) => Math.max(5, Math.min(95, prev + (Math.random() - 0.5) * 10)));
      setRamUsage((prev) => Math.max(30, Math.min(90, prev + (Math.random() - 0.5) * 5)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Office</h1>
        <p className="text-sm text-[#555555] mt-0.5">Workspace overview & local machine status</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* System Info */}
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-medium text-[#f5f5f5]">System</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-[11px] text-[#555555]">Hostname</span><span className="text-[11px] text-[#f5f5f5]">test7-mac</span></div>
            <div className="flex justify-between"><span className="text-[11px] text-[#555555]">OS</span><span className="text-[11px] text-[#f5f5f5]">macOS Darwin 25.3.0</span></div>
            <div className="flex justify-between"><span className="text-[11px] text-[#555555]">Arch</span><span className="text-[11px] text-[#f5f5f5]">x64</span></div>
            <div className="flex justify-between"><span className="text-[11px] text-[#555555]">Uptime</span><span className="text-[11px] text-[#f5f5f5]">6h 42m</span></div>
            <div className="flex justify-between"><span className="text-[11px] text-[#555555]">Node</span><span className="text-[11px] text-[#f5f5f5]">v22.22.1</span></div>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-medium text-[#f5f5f5]">Resources</h2>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[11px] text-[#555555]">CPU</span>
                <span className="text-[11px] text-[#f5f5f5]">{Math.round(cpuUsage)}%</span>
              </div>
              <div className="w-full h-2 bg-[#222222] rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all duration-1000" style={{ width: `${cpuUsage}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[11px] text-[#555555]">RAM</span>
                <span className="text-[11px] text-[#f5f5f5]">{Math.round(ramUsage)}%</span>
              </div>
              <div className="w-full h-2 bg-[#222222] rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all duration-1000" style={{ width: `${ramUsage}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[11px] text-[#555555]">Disk</span>
                <span className="text-[11px] text-[#f5f5f5]">54%</span>
              </div>
              <div className="w-full h-2 bg-[#222222] rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: "54%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#111111] border border-[#222222] rounded-md p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <HardDrive className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-medium text-[#f5f5f5]">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            <button className="w-full flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#222222] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] transition-colors">
              <Terminal className="w-4 h-4 text-green-400" /> Open Terminal
            </button>
            <button className="w-full flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#222222] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] transition-colors">
              <FolderOpen className="w-4 h-4 text-cyan-400" /> Open Workspace Folder
            </button>
            <button className="w-full flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#222222] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] transition-colors">
              <RotateCcw className="w-4 h-4 text-orange-400" /> Restart Gateway
            </button>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-medium text-[#f5f5f5]">Running Services</h2>
        </div>
        <div className="space-y-2">
          {SERVICES.map((svc) => (
            <div key={svc.name} className="flex items-center justify-between bg-[#0a0a0a] rounded-md px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className={clsx("w-2 h-2 rounded-full", svc.status === "Running" ? "bg-emerald-500" : "bg-red-500")} />
                <span className="text-[13px] text-[#f5f5f5]">{svc.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#555555]">:{svc.port}</span>
                <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm", svc.status === "Running" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>{svc.status}</span>
              </div>
            </div>
          ))}
          <div className="mt-2 px-1">
            <span className="text-[11px] text-[#555555]">Gateway URL: </span>
            <span className="text-[11px] text-cyan-400 font-mono">http://127.0.0.1:18789</span>
          </div>
        </div>
      </div>

      {/* Recent Files */}
      <div className="bg-[#111111] border border-[#222222] rounded-md p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-medium text-[#f5f5f5]">Recent Files</h2>
        </div>
        <div className="space-y-1">
          {RECENT_FILES.map((f) => (
            <div key={f.name} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#555555]" />
                <span className="text-[13px] text-[#f5f5f5]">{f.name}</span>
                <span className="text-[11px] text-[#555555] font-mono">{f.path}</span>
              </div>
              <span className="text-[10px] text-[#555555]">{f.modified}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
