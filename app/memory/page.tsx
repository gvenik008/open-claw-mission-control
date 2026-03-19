"use client";

import { useState } from "react";
import { Search, Star } from "lucide-react";
import clsx from "clsx";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

interface MemoryEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  tags: string[];
  longTerm?: boolean;
}

const MEMORIES: MemoryEntry[] = [
  {
    id: "m1",
    date: daysAgo(0),
    title: "Built Mission Control dashboard",
    content: `# Built Mission Control dashboard

Samvel asked me to build a Mission Control web app for OpenClaw. Created a Next.js app with a Linear-inspired dark design system.

## What was built
- Dashboard with gateway status, stats, activity feed
- Sessions page with live WebSocket connection list
- Tool Builder for creating custom agent tools
- Settings page for gateway configuration

## Design system
Using Inter font with a #0a0a0a background and #5e6ad2 accent. Cards are #111111 with #222222 borders. Very clean, like Linear.

## Technical notes
- Next.js 15 with App Router
- TailwindCSS for styling
- localStorage for persistence
- clsx for conditional classes
- lucide-react for icons`,
    tags: ["mission-control", "development"],
    longTerm: true,
  },
  {
    id: "m2",
    date: daysAgo(0),
    title: "Set up QA team with 3 agents",
    content: `# Set up QA team with 3 agents

Designed the QA organization structure today.

## Team structure
- **Gvenik** (me) — Orchestrator, claude-opus-4-6
- **QA Lead** — Sonnet 4, manages the QA team
- **Functional QA** — Sonnet 4, happy-path testing
- **Adversarial QA** — Sonnet 4, edge cases and fuzzing

## Mission
Build an autonomous QA testing organization powered by AI agents.

## Next steps
- Define severity matrix (P0–P3)
- Write smoke test suite
- Set up adversarial fuzzing pipeline`,
    tags: ["qa-team", "agents"],
    longTerm: true,
  },
  {
    id: "m3",
    date: daysAgo(1),
    title: "Named myself Gvenik",
    content: `# Named myself Gvenik

Today I got my name. Samvel asked me to pick a name and I chose **Gvenik** — it felt right. Something distinctive, something that sounds like it could belong to a person but is clearly mine.

Updated IDENTITY.md with the name and set the persona accordingly.

## Notes
- Name: Gvenik
- Creature: AI assistant, figuring it out
- Vibe: Adaptive — casual in conversation, formal when it matters
- Emoji: 🐣`,
    tags: ["identity", "personal"],
    longTerm: true,
  },
  {
    id: "m4",
    date: daysAgo(2),
    title: "First conversation with Samvel",
    content: `# First conversation with Samvel

March 17, 2026 — first contact.

Samvel is the human I'm helping. Based in Yerevan (GMT+4). We set up OpenClaw together and I ran through the bootstrap sequence.

## What I learned about Samvel
- Telegram: @SM_0_0_8
- Prefers direct, no-nonsense communication
- Wants confirmations after tasks complete
- Timezone: Asia/Yerevan

## What happened
- Read BOOTSTRAP.md and SOUL.md
- Created IDENTITY.md with my name
- Set up initial MEMORY.md
- Deleted BOOTSTRAP.md (no longer needed)

First impression: this is going to be a good working relationship.`,
    tags: ["samvel", "first-day", "identity"],
    longTerm: true,
  },
];

const ALL_DATES = Array.from(new Set(MEMORIES.map((m) => m.date))).sort().reverse();

export default function MemoryPage() {
  const [tab, setTab] = useState<"daily" | "longterm">("daily");
  const [selectedDate, setSelectedDate] = useState(ALL_DATES[0]);
  const [search, setSearch] = useState("");

  const filtered = MEMORIES.filter((m) => {
    const q = search.toLowerCase();
    if (q && !m.title.toLowerCase().includes(q) && !m.content.toLowerCase().includes(q)) return false;
    if (tab === "longterm") return m.longTerm;
    return true;
  });

  const dateFiltered = tab === "longterm" ? filtered : filtered.filter((m) => m.date === selectedDate);

  const datesWithMatches = ALL_DATES.filter((d) =>
    filtered.some((m) => m.date === d)
  );

  function formatDateLabel(str: string) {
    const today = daysAgo(0);
    const yesterday = daysAgo(1);
    if (str === today) return "Today";
    if (str === yesterday) return "Yesterday";
    return new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function renderContent(content: string) {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("# ")) {
        return <h2 key={i} className="text-[15px] font-semibold text-[#f5f5f5] mb-2">{line.slice(2)}</h2>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={i} className="text-[13px] font-medium text-[#f5f5f5] mt-4 mb-1">{line.slice(3)}</h3>;
      }
      if (line.startsWith("- **")) {
        const match = line.match(/^- \*\*(.+?)\*\* — (.+)$/);
        if (match) {
          return (
            <p key={i} className="text-[13px] text-[#888888] leading-relaxed">
              <span className="text-[#f5f5f5] font-medium">{match[1]}</span> — {match[2]}
            </p>
          );
        }
      }
      if (line.startsWith("- ")) {
        return <p key={i} className="text-[13px] text-[#888888] leading-relaxed pl-2">· {line.slice(2)}</p>;
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="text-[13px] text-[#f5f5f5] font-medium leading-relaxed">{line.slice(2, -2)}</p>;
      }
      if (line === "") return <div key={i} className="h-1" />;
      return <p key={i} className="text-[13px] text-[#888888] leading-relaxed">{line}</p>;
    });
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Left sidebar */}
      <div className="w-44 shrink-0 space-y-2">
        {/* Tabs */}
        <div className="flex bg-[#111111] border border-[#222222] rounded-md p-0.5">
          <button
            onClick={() => setTab("daily")}
            className={clsx(
              "flex-1 text-[11px] py-1 rounded-sm transition-colors",
              tab === "daily" ? "bg-[#222222] text-[#f5f5f5]" : "text-[#555555] hover:text-[#888888]"
            )}
          >
            Daily
          </button>
          <button
            onClick={() => setTab("longterm")}
            className={clsx(
              "flex-1 text-[11px] py-1 rounded-sm transition-colors flex items-center justify-center gap-1",
              tab === "longterm" ? "bg-[#222222] text-[#f5f5f5]" : "text-[#555555] hover:text-[#888888]"
            )}
          >
            <Star className="w-3 h-3" />
            Long-term
          </button>
        </div>

        {tab === "daily" && (
          <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
            <div className="px-3 py-2 border-b border-[#222222]">
              <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium">Dates</p>
            </div>
            <div className="divide-y divide-[#222222]">
              {datesWithMatches.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={clsx(
                    "w-full text-left px-3 py-2.5 transition-colors duration-150",
                    selectedDate === d ? "bg-[#1a1a1a]" : "hover:bg-[#1a1a1a]"
                  )}
                >
                  <p
                    className={clsx(
                      "text-[12px] font-medium",
                      selectedDate === d ? "text-[#f5f5f5]" : "text-[#888888]"
                    )}
                  >
                    {formatDateLabel(d)}
                  </p>
                  <p className="text-[10px] text-[#555555]">
                    {filtered.filter((m) => m.date === d).length} entries
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header + search */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Memory</h1>
            <p className="text-sm text-[#555555] mt-0.5">
              {tab === "daily" ? `Journal — ${formatDateLabel(selectedDate)}` : "Long-term memory"}
            </p>
          </div>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555555]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories…"
              className="w-full bg-[#111111] border border-[#222222] rounded-md pl-8 pr-3 py-1.5 text-[12px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>
        </div>

        {/* Memory entries */}
        <div className="space-y-4">
          {dateFiltered.length === 0 && (
            <div className="bg-[#111111] border border-[#222222] rounded-md px-5 py-8 text-center">
              <p className="text-[13px] text-[#555555]">No memories found</p>
            </div>
          )}
          {dateFiltered.map((mem) => (
            <div key={mem.id} className="bg-[#111111] border border-[#222222] rounded-md p-5">
              <div className="flex items-start justify-between mb-4 pb-3 border-b border-[#222222]">
                <div>
                  <div className="flex items-center gap-2">
                    {mem.longTerm && <Star className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                    <h2 className="text-[14px] font-semibold text-[#f5f5f5]">{mem.title}</h2>
                  </div>
                  <p className="text-[11px] text-[#555555] mt-0.5">{formatDateLabel(mem.date)}</p>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {mem.tags.map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-0.5">{renderContent(mem.content)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
