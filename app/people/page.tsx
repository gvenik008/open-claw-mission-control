"use client";

import { useState, useEffect } from "react";
import { Plus, X, Search } from "lucide-react";
import clsx from "clsx";

type PersonStatus = "Online" | "Away" | "Offline";

interface Person {
  id: string;
  name: string;
  role: string;
  email: string;
  telegram: string;
  status: PersonStatus;
  color: string;
  bio: string;
  location: string;
}

const STATUS_DOTS: Record<PersonStatus, string> = {
  Online: "bg-emerald-500",
  Away: "bg-yellow-500",
  Offline: "bg-[#555555]",
};

const COLORS = ["bg-purple-600", "bg-cyan-600", "bg-orange-600", "bg-emerald-600", "bg-red-600", "bg-blue-600", "bg-pink-600", "bg-yellow-600"];

const DEFAULT_PEOPLE: Person[] = [
  { id: "pe1", name: "Samvel", role: "Founder & Lead", email: "samvel@openclaw.dev", telegram: "@SM_0_0_8", status: "Online", color: COLORS[0], bio: "Building the future of AI agents", location: "Yerevan, Armenia" },
  { id: "pe2", name: "Gvenik", role: "AI Assistant", email: "gvenik@openclaw.dev", telegram: "@gvenik_bot", status: "Online", color: COLORS[1], bio: "Your helpful AI companion", location: "The Cloud" },
  { id: "pe3", name: "Alex Chen", role: "Backend Engineer", email: "alex@openclaw.dev", telegram: "@alexc", status: "Away", color: COLORS[2], bio: "Distributed systems enthusiast", location: "San Francisco, CA" },
  { id: "pe4", name: "Maya Patel", role: "Design Lead", email: "maya@openclaw.dev", telegram: "@mayap", status: "Online", color: COLORS[3], bio: "Making AI interfaces beautiful", location: "London, UK" },
  { id: "pe5", name: "Jordan Kim", role: "ML Engineer", email: "jordan@openclaw.dev", telegram: "@jordank", status: "Offline", color: COLORS[4], bio: "Training models, breaking benchmarks", location: "Seoul, Korea" },
  { id: "pe6", name: "Sarah Miller", role: "Product Manager", email: "sarah@openclaw.dev", telegram: "@sarahm", status: "Online", color: COLORS[5], bio: "Connecting users with solutions", location: "New York, NY" },
  { id: "pe7", name: "Omar Hassan", role: "DevOps Engineer", email: "omar@openclaw.dev", telegram: "@omarh", status: "Away", color: COLORS[6], bio: "Keeping the lights on", location: "Dubai, UAE" },
  { id: "pe8", name: "Lisa Wang", role: "QA Lead", email: "lisa@openclaw.dev", telegram: "@lisaw", status: "Online", color: COLORS[7], bio: "Breaking things so users don't", location: "Toronto, Canada" },
];

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Person | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", email: "", telegram: "", bio: "", location: "" });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mc-people");
      if (stored) setPeople(JSON.parse(stored));
      else { setPeople(DEFAULT_PEOPLE); localStorage.setItem("mc-people", JSON.stringify(DEFAULT_PEOPLE)); }
    } catch { setPeople(DEFAULT_PEOPLE); }
  }, []);

  function save(updated: Person[]) {
    setPeople(updated);
    localStorage.setItem("mc-people", JSON.stringify(updated));
  }

  function handleAdd() {
    if (!form.name.trim()) return;
    const person: Person = {
      id: "pe-" + Date.now(), ...form,
      status: "Offline" as PersonStatus,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    save([...people, person]);
    setForm({ name: "", role: "", email: "", telegram: "", bio: "", location: "" });
    setShowAdd(false);
  }

  const filtered = people.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.role.toLowerCase().includes(search.toLowerCase())
  );

  function initials(name: string) {
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">People</h1>
          <p className="text-sm text-[#555555] mt-0.5">Team directory & contacts</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Person
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or role..." className="w-full bg-[#111111] border border-[#222222] rounded-md pl-9 pr-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2]" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {filtered.map((person) => (
          <div key={person.id} onClick={() => setSelected(person)} className="bg-[#111111] border border-[#222222] rounded-md p-4 hover:bg-[#1a1a1a] transition-colors cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-semibold", person.color)}>
                {initials(person.name)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] text-[#f5f5f5] font-medium truncate">{person.name}</span>
                  <div className={clsx("w-2 h-2 rounded-full shrink-0", STATUS_DOTS[person.status])} />
                </div>
                <p className="text-[11px] text-[#555555] truncate">{person.role}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-[#555555] truncate">📧 {person.email}</p>
              <p className="text-[11px] text-[#555555] truncate">💬 {person.telegram}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Expanded View */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#111111] border border-[#222222] rounded-md w-96 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={clsx("w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-semibold", selected.color)}>
                  {initials(selected.name)}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#f5f5f5]">{selected.name}</h2>
                  <p className="text-[11px] text-[#555555]">{selected.role}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#555555] hover:text-[#888888]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 pt-2 border-t border-[#222222]">
              <div className="flex items-center gap-2"><div className={clsx("w-2 h-2 rounded-full", STATUS_DOTS[selected.status])} /><span className="text-[13px] text-[#888888]">{selected.status}</span></div>
              <p className="text-[13px] text-[#888888]">📧 {selected.email}</p>
              <p className="text-[13px] text-[#888888]">💬 {selected.telegram}</p>
              <p className="text-[13px] text-[#888888]">📍 {selected.location}</p>
              <p className="text-[13px] text-[#888888] pt-2 border-t border-[#222222]">{selected.bio}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#111111] border border-[#222222] rounded-md w-96 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#f5f5f5]">Add Person</h2>
              <button onClick={() => setShowAdd(false)} className="text-[#555555] hover:text-[#888888]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              {(["name", "role", "email", "telegram", "bio", "location"] as const).map((field) => (
                <div key={field}>
                  <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">{field}</label>
                  <input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} placeholder={field.charAt(0).toUpperCase() + field.slice(1)} className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2]" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowAdd(false)} className="bg-[#222222] hover:bg-[#2a2a2a] text-[#ccc] text-xs rounded-md px-3 py-1.5 transition-colors">Cancel</button>
              <button onClick={handleAdd} className="bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
