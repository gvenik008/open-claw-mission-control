"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import clsx from "clsx";

interface CalEvent {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  recurrence: "once" | "daily" | "weekly";
  agent: string;
  color: string;
}

const AGENTS = ["Gvenik", "QA Lead", "Functional QA", "Adversarial QA"];
const EVENT_COLORS = ["bg-[#5e6ad2]", "bg-emerald-600", "bg-orange-600", "bg-yellow-600", "bg-pink-600"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function dateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  // 0=Sun,1=Mon... → convert to Mon-based (0=Mon, 6=Sun)
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

function generateSampleEvents(): CalEvent[] {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const events: CalEvent[] = [];

  // Daily standup
  for (let d = 1; d <= getDaysInMonth(year, month); d++) {
    events.push({
      id: `standup-${d}`,
      name: "Daily QA standup",
      date: dateStr(year, month, d),
      time: "09:00",
      recurrence: "daily",
      agent: "QA Lead",
      color: "bg-[#5e6ad2]",
    });
    // Security scan
    events.push({
      id: `security-${d}`,
      name: "Security scan",
      date: dateStr(year, month, d),
      time: "02:00",
      recurrence: "daily",
      agent: "Adversarial QA",
      color: "bg-orange-600",
    });
  }
  // Weekly test report on Fridays
  for (let d = 1; d <= getDaysInMonth(year, month); d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow === 5) {
      events.push({
        id: `report-${d}`,
        name: "Weekly test report",
        date: dateStr(year, month, d),
        time: "17:00",
        recurrence: "weekly",
        agent: "QA Lead",
        color: "bg-emerald-600",
      });
    }
  }
  return events;
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    date: todayStr(),
    time: "09:00",
    recurrence: "once" as CalEvent["recurrence"],
    agent: AGENTS[0],
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mc-calendar-events");
      if (stored) {
        setEvents(JSON.parse(stored));
      } else {
        const sample = generateSampleEvents();
        setEvents(sample);
        localStorage.setItem("mc-calendar-events", JSON.stringify(sample));
      }
    } catch {
      const sample = generateSampleEvents();
      setEvents(sample);
    }
  }, []);

  function saveEvents(updated: CalEvent[]) {
    setEvents(updated);
    localStorage.setItem("mc-calendar-events", JSON.stringify(updated));
  }

  function handleCreate() {
    if (!form.name.trim()) return;
    const newEvent: CalEvent = {
      id: "evt-" + Date.now(),
      ...form,
      color: EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
    };
    saveEvents([...events, newEvent]);
    setForm({ name: "", date: todayStr(), time: "09:00", recurrence: "once", agent: AGENTS[0] });
    setShowModal(false);
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const today_str = todayStr();

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function eventsForDay(d: number) {
    const ds = dateStr(year, month, d);
    return events.filter((e) => e.date === ds).slice(0, 3);
  }

  // Upcoming: next 7 days
  const upcoming: CalEvent[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const ds = d.toISOString().split("T")[0];
    events
      .filter((e) => e.date === ds)
      .forEach((e) => upcoming.push(e));
  }
  upcoming.sort((a, b) => a.time.localeCompare(b.time));

  const monthName = new Date(year, month, 1).toLocaleString("en-US", { month: "long" });

  return (
    <div className="flex gap-4 h-full">
      {/* Main calendar */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Calendar</h1>
            <p className="text-sm text-[#555555] mt-0.5">Scheduled jobs & events</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="bg-[#222222] hover:bg-[#2a2a2a] text-[#888888] rounded-md p-1.5 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[13px] text-[#f5f5f5] font-medium w-28 text-center">
                {monthName} {year}
              </span>
              <button
                onClick={nextMonth}
                className="bg-[#222222] hover:bg-[#2a2a2a] text-[#888888] rounded-md p-1.5 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Event
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
          {/* DOW headers */}
          <div className="grid grid-cols-7 border-b border-[#222222]">
            {DOW.map((d) => (
              <div key={d} className="px-2 py-2 text-center">
                <span className="text-[10px] uppercase tracking-wider text-[#555555] font-medium">{d}</span>
              </div>
            ))}
          </div>
          {/* Weeks */}
          <div>
            {Array.from({ length: cells.length / 7 }).map((_, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-[#222222] last:border-0">
                {cells.slice(wi * 7, wi * 7 + 7).map((day, di) => {
                  const ds = day ? dateStr(year, month, day) : null;
                  const isToday = ds === today_str;
                  const dayEvents = day ? eventsForDay(day) : [];
                  return (
                    <div
                      key={di}
                      className={clsx(
                        "min-h-[80px] px-2 py-1.5 border-r border-[#222222] last:border-r-0",
                        day ? "hover:bg-[#1a1a1a] transition-colors duration-150" : "bg-[#0a0a0a]/40"
                      )}
                    >
                      {day && (
                        <>
                          <span
                            className={clsx(
                              "text-[12px] font-medium inline-block w-5 h-5 flex items-center justify-center rounded",
                              isToday
                                ? "bg-[#5e6ad2] text-white"
                                : "text-[#888888]"
                            )}
                          >
                            {day}
                          </span>
                          <div className="mt-1 space-y-0.5">
                            {dayEvents.map((ev) => (
                              <div
                                key={ev.id}
                                className={clsx("text-[10px] text-white px-1 py-0.5 rounded-sm truncate", ev.color)}
                                title={`${ev.name} ${ev.time}`}
                              >
                                {ev.time} {ev.name}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar: upcoming */}
      <div className="w-52 shrink-0">
        <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[#222222]">
            <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium">Upcoming</p>
            <p className="text-[11px] text-[#555555] mt-0.5">Next 7 days</p>
          </div>
          <div className="divide-y divide-[#222222] max-h-96 overflow-y-auto">
            {upcoming.slice(0, 20).map((ev) => (
              <div key={ev.id} className="px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors duration-150">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", ev.color)} />
                  <p className="text-[12px] text-[#f5f5f5] leading-snug truncate">{ev.name}</p>
                </div>
                <p className="text-[11px] text-[#555555]">{ev.date} · {ev.time}</p>
                <p className="text-[10px] text-[#555555] truncate">{ev.agent}</p>
              </div>
            ))}
            {upcoming.length === 0 && (
              <div className="px-3 py-4 text-center text-[12px] text-[#555555]">No upcoming events</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#111111] border border-[#222222] rounded-md w-96 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#f5f5f5]">Add Event</h2>
              <button onClick={() => setShowModal(false)} className="text-[#555555] hover:text-[#888888]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Name</label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Event name"
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Recurrence</label>
                  <select
                    value={form.recurrence}
                    onChange={(e) => setForm({ ...form, recurrence: e.target.value as CalEvent["recurrence"] })}
                    className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Agent</label>
                  <select
                    value={form.agent}
                    onChange={(e) => setForm({ ...form, agent: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]"
                  >
                    {AGENTS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="bg-[#222222] hover:bg-[#2a2a2a] text-[#ccc] text-xs rounded-md px-3 py-1.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
