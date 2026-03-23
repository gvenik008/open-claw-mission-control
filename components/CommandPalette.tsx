"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Users, Bot, ChevronRight, LayoutDashboard, CheckSquare, UserPlus, Building2, Wrench, Brain, ShieldCheck, Calendar, GitBranch, Factory, Radio, Radar, Settings, Server, Sparkles, MessageCircle, FolderKanban } from "lucide-react";

// ── Static pages (all 19 sidebar routes) ─────────────────────────────────────
const PAGES = [
  { label: "Dashboard",        path: "/",                  icon: LayoutDashboard },
  { label: "Tasks",            path: "/tasks",             icon: CheckSquare },
  { label: "Agents",           path: "/agents",            icon: UserPlus },
  { label: "Team Canvas",      path: "/team",              icon: Users },
  { label: "Office",           path: "/office",            icon: Building2 },
  { label: "Skills & Tools",   path: "/skills-tools",      icon: Wrench },
  { label: "Memory",           path: "/memory",            icon: Brain },
  { label: "Reports",          path: "/reports",           icon: ShieldCheck },
  { label: "Docs",             path: "/docs",              icon: FileText },
  { label: "Calendar",         path: "/calendar",          icon: Calendar },
  { label: "Pipeline",         path: "/pipeline",          icon: GitBranch },
  { label: "Factory",          path: "/factory",           icon: Factory },
  { label: "Sessions",         path: "/sessions",          icon: Radio },
  { label: "Monitoring",       path: "/radar",             icon: Radar },
  { label: "Settings",         path: "/settings",          icon: Settings },
  { label: "Master Control",   path: "/admin",             icon: Server },
  { label: "Instances",        path: "/admin/instances",   icon: Radar },
  { label: "Shared Registry",  path: "/admin/shared",      icon: Sparkles },
  { label: "Activity Log",     path: "/admin/activity",    icon: MessageCircle },
];

type ResultItem = {
  id: string;
  category: "Pages" | "Tasks" | "Agents" | "Reports";
  label: string;
  sublabel?: string;
  path: string;
  Icon: React.ElementType;
};

// ── Category icon map ─────────────────────────────────────────────────────────
const CATEGORY_ICON: Record<string, React.ElementType> = {
  Pages:   FolderKanban,
  Tasks:   CheckSquare,
  Agents:  Bot,
  Reports: FileText,
};

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<{ tasks: ResultItem[]; agents: ResultItem[]; reports: ResultItem[] } | null>(null);

  // ── Open / close ─────────────────────────────────────────────────────────
  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    dataRef.current = null;
  }, []);

  // ── Keyboard shortcut listener ────────────────────────────────────────────
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) { closePalette(); return false; }
          openPalette(); return true;
        });
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [openPalette, closePalette]);

  // ── Focus input when opened ───────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      fetchDynamicData();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch dynamic data once on open ──────────────────────────────────────
  const fetchDynamicData = async () => {
    setLoading(true);
    try {
      const [tasksRes, agentsRes, reportsRes] = await Promise.allSettled([
        fetch("/api/tasks"),
        fetch("/api/deploy-agent"),
        fetch("/api/reports"),
      ]);

      const tasks: ResultItem[] = [];
      const agents: ResultItem[] = [];
      const reports: ResultItem[] = [];

      if (tasksRes.status === "fulfilled" && tasksRes.value.ok) {
        const data = await tasksRes.value.json();
        const list = Array.isArray(data) ? data : (data.tasks ?? []);
        list.slice(0, 50).forEach((t: { id?: string; title?: string; status?: string }) => {
          tasks.push({
            id: `task-${t.id}`,
            category: "Tasks",
            label: t.title ?? "Untitled Task",
            sublabel: t.status ?? "",
            path: "/tasks",
            Icon: CheckSquare,
          });
        });
      }

      if (agentsRes.status === "fulfilled" && agentsRes.value.ok) {
        const data = await agentsRes.value.json();
        const list = Array.isArray(data) ? data : (data.agents ?? []);
        list.slice(0, 50).forEach((a: { id?: string; agent_id?: string; name?: string; role?: string }) => {
          agents.push({
            id: `agent-${a.id ?? a.agent_id}`,
            category: "Agents",
            label: a.name ?? "Unnamed Agent",
            sublabel: a.role ?? "",
            path: "/agents",
            Icon: Bot,
          });
        });
      }

      if (reportsRes.status === "fulfilled" && reportsRes.value.ok) {
        const data = await reportsRes.value.json();
        const list = Array.isArray(data) ? data : (data.reports ?? []);
        list.slice(0, 50).forEach((r: { id?: string; filename?: string; title?: string }) => {
          reports.push({
            id: `report-${r.id ?? r.filename}`,
            category: "Reports",
            label: r.title ?? r.filename ?? "Untitled Report",
            path: "/reports",
            Icon: FileText,
          });
        });
      }

      dataRef.current = { tasks, agents, reports };
    } catch {
      // ignore — will just show pages only
    } finally {
      setLoading(false);
    }
  };

  // ── Search logic (debounced 200ms) ────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = (q: string) => {
    const lower = q.toLowerCase().trim();

    // Pages — always included (filtered by query)
    const pageResults: ResultItem[] = PAGES
      .filter((p) => !lower || p.label.toLowerCase().includes(lower) || p.path.toLowerCase().includes(lower))
      .map((p) => ({
        id: `page-${p.path}`,
        category: "Pages" as const,
        label: p.label,
        sublabel: p.path,
        path: p.path,
        Icon: p.icon,
      }));

    const dynamic = dataRef.current;
    if (!dynamic) {
      setResults(pageResults);
      setSelectedIndex(0);
      return;
    }

    const filterList = (items: ResultItem[]) =>
      !lower
        ? items
        : items.filter(
            (i) =>
              i.label.toLowerCase().includes(lower) ||
              (i.sublabel ?? "").toLowerCase().includes(lower)
          );

    const all = [
      ...pageResults,
      ...filterList(dynamic.tasks),
      ...filterList(dynamic.agents),
      ...filterList(dynamic.reports),
    ];

    setResults(all);
    setSelectedIndex(0);
  };

  // ── Re-run search when dynamic data loads ────────────────────────────────
  useEffect(() => {
    if (!loading && dataRef.current) {
      runSearch(query);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard navigation inside palette ───────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        navigate(results[selectedIndex].path);
      }
    } else if (e.key === "Escape") {
      closePalette();
    }
  };

  const navigate = (path: string) => {
    router.push(path);
    closePalette();
  };

  // ── Group results by category ─────────────────────────────────────────────
  const grouped = results.reduce<Record<string, { item: ResultItem; globalIndex: number }[]>>(
    (acc, item, idx) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push({ item, globalIndex: idx });
      return acc;
    },
    {}
  );

  const categoryOrder: ResultItem["category"][] = ["Pages", "Tasks", "Agents", "Reports"];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center"
      onClick={closePalette}
    >
      <div
        className="bg-[#111111] border border-[#222222] rounded-xl w-full max-w-lg mx-4 mt-[20vh] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-[#222222]">
          <Search className="w-4 h-4 text-[#555555] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, tasks, agents, reports…"
            className="flex-1 bg-transparent py-3 text-[15px] text-[#f5f5f5] placeholder-[#444444] outline-none"
          />
          {loading && (
            <span className="text-[11px] text-[#555555] animate-pulse">Loading…</span>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#333333] text-[10px] text-[#555555]">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto py-2">
          {results.length === 0 && !loading && (
            <p className="text-[13px] text-[#555555] text-center py-8">
              {query ? "No results found." : "Start typing to search…"}
            </p>
          )}

          {categoryOrder.map((cat) => {
            const items = grouped[cat];
            if (!items || items.length === 0) return null;
            const CatIcon = CATEGORY_ICON[cat];

            return (
              <div key={cat} className="mb-1">
                {/* Category header */}
                <div className="flex items-center gap-2 px-4 py-1.5">
                  <CatIcon className="w-3 h-3 text-[#444444]" />
                  <span className="text-[10px] uppercase tracking-wider text-[#555555] font-medium">
                    {cat}
                  </span>
                </div>

                {/* Items */}
                {items.map(({ item, globalIndex }) => {
                  const isSelected = selectedIndex === globalIndex;
                  const ItemIcon = item.Icon;
                  return (
                    <button
                      key={item.id}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors border-l-2 ${
                        isSelected
                          ? "bg-[#1a1a1a] border-[#5e6ad2]"
                          : "border-transparent hover:bg-[#161616]"
                      }`}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      onClick={() => navigate(item.path)}
                    >
                      <ItemIcon
                        className={`w-4 h-4 shrink-0 ${isSelected ? "text-[#5e6ad2]" : "text-[#555555]"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-[13px] truncate block ${isSelected ? "text-[#f5f5f5]" : "text-[#aaaaaa]"}`}>
                          {item.label}
                        </span>
                        {item.sublabel && (
                          <span className="text-[11px] text-[#555555] truncate block">
                            {item.sublabel}
                          </span>
                        )}
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-[#5e6ad2]" : "text-[#333333]"}`} />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 border-t border-[#1a1a1a]">
            <span className="text-[10px] text-[#444444]">↑↓ navigate</span>
            <span className="text-[10px] text-[#444444]">↵ open</span>
            <span className="text-[10px] text-[#444444]">esc close</span>
          </div>
        )}
      </div>
    </div>
  );
}
