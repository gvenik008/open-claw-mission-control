"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  Radio,
  Settings,
  Users,
  UserPlus,
  CheckSquare,
  Calendar,
  Brain,
  FileText,
  PenTool,
  ShieldCheck,
  Sparkles,
  FolderKanban,
  Contact,
  Building2,
  Server,
  Radar,
  Factory,
  GitBranch,
  MessageCircle,
} from "lucide-react";
import clsx from "clsx";

const NAV_GROUPS = [
  {
    label: "Navigation",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/sessions", label: "Sessions", icon: Radio },
    ],
  },
  {
    label: "Team & Work",
    items: [
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/agents", label: "Agents", icon: UserPlus },
      { href: "/skills-tools", label: "Skills & Tools", icon: Wrench },
      { href: "/content", label: "Content", icon: PenTool },
      { href: "/approvals", label: "Approvals", icon: ShieldCheck },
      { href: "/council", label: "Council", icon: Sparkles },
      { href: "/calendar", label: "Calendar", icon: Calendar },
      { href: "/projects", label: "Projects", icon: FolderKanban },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { href: "/memory", label: "Memory", icon: Brain },
      { href: "/docs", label: "Docs", icon: FileText },
      { href: "/people", label: "People", icon: Contact },
      { href: "/office", label: "Office", icon: Building2 },
      { href: "/team", label: "Team", icon: Users },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/system", label: "System", icon: Server },
      { href: "/radar", label: "Radar", icon: Radar },
      { href: "/factory", label: "Factory", icon: Factory },
      { href: "/pipeline", label: "Pipeline", icon: GitBranch },
      { href: "/feedback", label: "Feedback", icon: MessageCircle },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/admin", label: "Master Control", icon: Server },
      { href: "/admin/instances", label: "Instances", icon: Radar },
      { href: "/admin/shared", label: "Shared Registry", icon: Sparkles },
      { href: "/admin/activity", label: "Activity Log", icon: MessageCircle },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 h-screen flex flex-col border-r border-[#222222] bg-[#111111] shrink-0">
      {/* Workspace switcher */}
      <div className="px-3 py-4 border-b border-[#222222]">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors cursor-pointer">
          <div className="w-5 h-5 rounded bg-[#5e6ad2] flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-semibold leading-none">OC</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[#f5f5f5] truncate leading-tight">OpenClaw</p>
            <p className="text-[11px] text-[#555555] truncate leading-tight">Mission Control</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            <p className="text-[10px] uppercase tracking-wider text-[#555555] font-medium px-2 py-1.5 mt-2 mb-0.5">
              {group.label}
            </p>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-all duration-150 border-l-2",
                    active
                      ? "bg-[#1a1a1a] text-[#f5f5f5] border-[#5e6ad2]"
                      : "text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] border-transparent"
                  )}
                >
                  <Icon
                    className={clsx("w-4 h-4 shrink-0", active ? "text-[#5e6ad2]" : "text-[#555555]")}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#222222]">
        <div className="space-y-1">
          <p className="text-[11px] text-[#555555]">v0.1.0</p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-[#555555]">Gateway online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
