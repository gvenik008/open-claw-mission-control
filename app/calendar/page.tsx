"use client"

import { Calendar } from "lucide-react"

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="border border-[#222222] rounded-xl p-10 max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="p-4 rounded-full border border-[#222222] bg-[#111111]">
            <Calendar size={32} color="#5e6ad2" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-[#f5f5f5]">Calendar</h1>
          <p className="text-sm font-medium text-[#5e6ad2] uppercase tracking-widest">
            Coming Soon
          </p>
        </div>
        <p className="text-sm text-[#555555] leading-relaxed">
          Visualize your entire content schedule at a glance. Plan
          campaigns, track deadlines, and coordinate publishing across
          your team with a shared editorial calendar.
        </p>
      </div>
    </div>
  )
}
