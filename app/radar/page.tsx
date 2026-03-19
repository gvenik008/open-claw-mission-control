"use client";

import { Radar } from "lucide-react";

export default function RadarPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 px-6 py-16 text-center max-w-md">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl border border-[#222222] bg-[#111111]">
          <Radar className="w-8 h-8 text-[#5e6ad2]" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Radar</h1>
          <p className="text-sm text-[#888888] leading-relaxed">
            Monitoring and alerting dashboard
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#222222] bg-[#111111]">
          <span className="w-2 h-2 rounded-full bg-[#5e6ad2] animate-pulse" />
          <span className="text-xs text-[#666666] font-medium tracking-wide uppercase">
            Coming Soon
          </span>
        </div>
        <p className="text-xs text-[#555555] leading-relaxed">
          This feature is under active development. Check back soon.
        </p>
      </div>
    </div>
  );
}
