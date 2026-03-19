"use client"

import { FolderKanban } from "lucide-react"

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="border border-[#222222] rounded-xl p-10 max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="p-4 rounded-full border border-[#222222] bg-[#111111]">
            <FolderKanban size={32} color="#5e6ad2" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-[#f5f5f5]">Projects</h1>
          <p className="text-sm font-medium text-[#5e6ad2] uppercase tracking-widest">
            Coming Soon
          </p>
        </div>
        <p className="text-sm text-[#555555] leading-relaxed">
          Organize work into projects and track progress end to end.
          Group tasks, set milestones, and give your team a clear
          picture of what's in flight and what's next.
        </p>
      </div>
    </div>
  )
}
