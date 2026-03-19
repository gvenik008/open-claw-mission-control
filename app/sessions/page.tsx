"use client";

import { Radio } from "lucide-react";

export default function SessionsPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-[#111111] border border-[#222222] rounded-xl p-10 text-center max-w-md">
        <div className="w-14 h-14 rounded-xl bg-[#5e6ad2]/10 flex items-center justify-center mx-auto mb-4">
          <Radio className="w-7 h-7 text-[#5e6ad2]" />
        </div>
        <h1 className="text-xl font-semibold text-[#f5f5f5] mb-2">Sessions</h1>
        <span className="text-[11px] font-medium text-[#5e6ad2] bg-[#5e6ad2]/10 px-2 py-0.5 rounded-full">Coming Soon</span>
        <p className="text-[13px] text-[#555555] mt-3 leading-relaxed">
          Live session monitoring — view active agent sessions, token usage, and conversation history in real-time.
        </p>
      </div>
    </div>
  );
}
