"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import clsx from "clsx";
import { Plus, CheckCircle2, Clock, AlertCircle, RefreshCw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  agent_id: string;
  name: string;
  role: string;
  model: string;
  division: string;
  status: string;
  skills: string[];
  tools: string[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string | null;
  created_at: string;
}

interface ActivityItem {
  id: string;
  agent_id: string;
  action: string;
  detail: string;
  created_at: string;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const ROBOT_COLORS: Record<string, { body: string; glow: string; eye: string }> = {
  main:             { body: "#5e6ad2", glow: "#5e6ad230", eye: "#a5b4fc" },
  "qa-lead":        { body: "#f59e0b", glow: "#f59e0b30", eye: "#fde68a" },
  "qa-functional":  { body: "#10b981", glow: "#10b98130", eye: "#6ee7b7" },
  "qa-security":    { body: "#ef4444", glow: "#ef444430", eye: "#fca5a5" },
  "qa-general":     { body: "#06b6d4", glow: "#06b6d430", eye: "#67e8f9" },
};
const DEFAULT_COLOR = { body: "#8b5cf6", glow: "#8b5cf630", eye: "#c4b5fd" };

function getColor(id: string) { return ROBOT_COLORS[id] || DEFAULT_COLOR; }

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-400", high: "text-orange-400", medium: "text-yellow-400", low: "text-[#888888]"
};

// ─── Default position helper (module-level so all scopes can access) ──────────

function defaultPosition(index: number): { x: number; y: number } {
  return {
    x: 120 + (index % 3) * 230,
    y: 120 + Math.floor(index / 3) * 270,
  };
}

// ─── SVG Components ───────────────────────────────────────────────────────────

function Robot({ color, size = 50 }: { color: { body: string; eye: string }; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <line x1="30" y1="10" x2="30" y2="4" stroke={color.body} strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="3" r="2.5" fill={color.body}><animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" /></circle>
      <rect x="16" y="10" width="28" height="22" rx="6" fill={color.body} />
      <rect x="20" y="15" width="20" height="10" rx="3" fill="#0a0a0a" opacity="0.7" />
      <circle cx="25" cy="20" r="2.5" fill={color.eye}><animate attributeName="r" values="2.5;2.5;0.5;2.5;2.5" dur="4s" repeatCount="indefinite" /></circle>
      <circle cx="35" cy="20" r="2.5" fill={color.eye}><animate attributeName="r" values="2.5;2.5;0.5;2.5;2.5" dur="4s" repeatCount="indefinite" /></circle>
      <rect x="19" y="33" width="22" height="16" rx="4" fill={color.body} opacity="0.85" />
      <circle cx="30" cy="40" r="2" fill={color.eye} opacity="0.6"><animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" /></circle>
      <rect x="11" y="35" width="7" height="3" rx="1.5" fill={color.body} opacity="0.7" />
      <rect x="42" y="35" width="7" height="3" rx="1.5" fill={color.body} opacity="0.7" />
      <rect x="23" y="49" width="5" height="6" rx="2" fill={color.body} opacity="0.7" />
      <rect x="32" y="49" width="5" height="6" rx="2" fill={color.body} opacity="0.7" />
    </svg>
  );
}

function Desk({ color, working }: { color: { body: string; eye: string }; working: boolean }) {
  return (
    <svg width="120" height="70" viewBox="0 0 120 70" fill="none">
      <rect x="5" y="40" width="110" height="8" rx="2" fill="#1a1a1a" />
      <rect x="12" y="48" width="4" height="20" rx="1" fill="#161616" />
      <rect x="104" y="48" width="4" height="20" rx="1" fill="#161616" />
      <rect x="56" y="30" width="8" height="10" rx="1" fill="#222222" />
      <rect x="48" y="37" width="24" height="4" rx="2" fill="#222222" />
      <rect x="30" y="2" width="60" height="30" rx="3" fill="#1a1a1a" stroke="#333333" strokeWidth="1" />
      <rect x="33" y="5" width="54" height="24" rx="2" fill={working ? "#0f1729" : "#111111"} />
      {working && (
        <>
          <rect x="37" y="9" width="30" height="2" rx="1" fill={color.body} opacity="0.4" />
          <rect x="37" y="13" width="42" height="2" rx="1" fill={color.body} opacity="0.25" />
          <rect x="37" y="17" width="25" height="2" rx="1" fill={color.body} opacity="0.35" />
          <rect x="37" y="21" width="38" height="2" rx="1" fill={color.body} opacity="0.2" />
          <rect x="62" y="17" width="2" height="2" fill={color.eye}><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" /></rect>
        </>
      )}
      <rect x="38" y="42" width="28" height="4" rx="1" fill="#161616" />
      <rect x="72" y="42" width="6" height="4" rx="2" fill="#161616" />
      <rect x="14" y="34" width="8" height="7" rx="2" fill="#222222" />
      <rect x="22" y="36" width="3" height="3" rx="1.5" fill="none" stroke="#333333" strokeWidth="1" />
      {working && <path d="M16 33 Q17 30 18 33" stroke="#33333380" strokeWidth="0.8" fill="none"><animate attributeName="d" values="M16 33 Q17 30 18 33;M16 31 Q17 28 18 31;M16 33 Q17 30 18 33" dur="3s" repeatCount="indefinite" /></path>}
      <rect x="96" y="34" width="10" height="7" rx="2" fill="#1a3a1a" />
      <circle cx="101" cy="32" r="4" fill="#22c55e" opacity="0.5" />
      <circle cx="99" cy="30" r="3" fill="#22c55e" opacity="0.4" />
    </svg>
  );
}

// ─── Agent Panel ──────────────────────────────────────────────────────────────

function AgentPanel({
  agent,
  tasks,
  activities,
  agents,
  onClose,
  onAssign,
}: {
  agent: Agent;
  tasks: Task[];
  activities: ActivityItem[];
  agents: Agent[];
  onClose: () => void;
  onAssign: (taskTitle: string, agentId: string) => void;
}) {
  const color = getColor(agent.agent_id);
  const agentTasks = tasks.filter((t) => t.assignee === agent.agent_id);
  const agentActivities = activities.filter((a) => a.agent_id === agent.agent_id).slice(0, 5);
  const activeTasks = agentTasks.filter((t) => t.status === "in_progress");
  const completedTasks = agentTasks.filter((t) => t.status === "done");
  const pendingTasks = agentTasks.filter((t) => t.status === "pending");

  const [showAssign, setShowAssign] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  return (
    <div
      className="bg-[#111111] border rounded-lg p-4 w-72 shadow-xl space-y-3 max-h-[80vh] overflow-y-auto"
      style={{ borderColor: `${color.body}40` }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color.body}20`, color: color.body }}>
            <span className="text-[13px] font-bold">{agent.name[0]}</span>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#f5f5f5]">{agent.name}</div>
            <div className="text-[10px] text-[#555555]">{agent.role.split("—")[0].trim()}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-[#555555] hover:text-[#888888]">✕</button>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#0a0a0a] rounded-md p-2 text-center">
          <div className="text-[16px] font-semibold text-[#5e6ad2]">{activeTasks.length}</div>
          <div className="text-[9px] text-[#555555]">Active</div>
        </div>
        <div className="bg-[#0a0a0a] rounded-md p-2 text-center">
          <div className="text-[16px] font-semibold text-yellow-400">{pendingTasks.length}</div>
          <div className="text-[9px] text-[#555555]">Pending</div>
        </div>
        <div className="bg-[#0a0a0a] rounded-md p-2 text-center">
          <div className="text-[16px] font-semibold text-emerald-400">{completedTasks.length}</div>
          <div className="text-[9px] text-[#555555]">Done</div>
        </div>
      </div>

      {/* Current Tasks */}
      {agentTasks.filter((t) => t.status !== "done").length > 0 && (
        <div>
          <p className="text-[10px] text-[#555555] uppercase tracking-wider font-medium mb-1.5">Current Tasks</p>
          <div className="space-y-1">
            {agentTasks.filter((t) => t.status !== "done").map((task) => (
              <div key={task.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md px-2.5 py-1.5">
                <div className="flex items-center gap-1.5">
                  {task.status === "in_progress" ? (
                    <Clock className="w-3 h-3 text-[#5e6ad2] animate-pulse shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-yellow-400 shrink-0" />
                  )}
                  <span className="text-[11px] text-[#f5f5f5] truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={clsx("text-[9px]", PRIORITY_COLORS[task.priority])}>{task.priority}</span>
                  <span className="text-[9px] text-[#444444]">{task.status.replace("_", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {agentActivities.length > 0 && (
        <div>
          <p className="text-[10px] text-[#555555] uppercase tracking-wider font-medium mb-1.5">Recent Activity</p>
          <div className="space-y-1">
            {agentActivities.map((a) => (
              <div key={a.id} className="text-[10px]">
                <span className="text-[#888888]">{a.action.replace(/_/g, " ")}</span>
                {a.detail && <span className="text-[#555555]"> — {a.detail.slice(0, 40)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Assign */}
      <div>
        {showAssign ? (
          <div className="space-y-2">
            <input
              className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-2.5 py-1.5 text-[12px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2]"
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTaskTitle.trim()) {
                  onAssign(newTaskTitle, agent.agent_id);
                  setNewTaskTitle("");
                  setShowAssign(false);
                }
              }}
              autoFocus
            />
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  if (newTaskTitle.trim()) {
                    onAssign(newTaskTitle, agent.agent_id);
                    setNewTaskTitle("");
                    setShowAssign(false);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[11px] bg-[#5e6ad2] hover:bg-[#6c78e0] text-white transition-all"
              >
                <Plus className="w-3 h-3" /> Assign
              </button>
              <button
                onClick={() => setShowAssign(false)}
                className="px-2 py-1 rounded-md text-[11px] text-[#555555] hover:text-[#888888] hover:bg-[#1a1a1a] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAssign(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] bg-[#1a1a1a] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] transition-all"
          >
            <Plus className="w-3 h-3" /> Assign Task
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Agent Canvas Node ────────────────────────────────────────────────────────

function AgentNode({
  agent,
  currentTask,
  taskCount,
  selected,
  dragging,
}: {
  agent: Agent;
  currentTask: Task | null;
  taskCount: number;
  selected: boolean;
  dragging: boolean;
}) {
  const color = getColor(agent.agent_id);
  const working = !!currentTask;

  return (
    <div
      className="relative inline-flex flex-col items-center select-none"
      style={{
        transform: dragging ? "scale(1.05)" : "scale(1)",
        transition: dragging ? "none" : "transform 0.15s ease",
        filter: dragging
          ? `drop-shadow(0 8px 24px ${color.body}50)`
          : selected
          ? `drop-shadow(0 4px 12px ${color.body}40)`
          : "none",
      }}
    >
      {/* Working pulse ring */}
      {working && (
        <div
          className="absolute rounded-2xl pointer-events-none animate-pulse"
          style={{
            inset: "-6px",
            border: `2px solid ${color.body}50`,
            backgroundColor: `${color.body}08`,
          }}
        />
      )}

      {/* Selected ring */}
      {selected && !working && (
        <div
          className="absolute rounded-2xl pointer-events-none"
          style={{
            inset: "-6px",
            border: `2px solid ${color.body}60`,
          }}
        />
      )}

      {/* Drag glow ring */}
      {dragging && (
        <div
          className="absolute rounded-2xl pointer-events-none"
          style={{
            inset: "-8px",
            border: `2px solid ${color.body}80`,
            boxShadow: `0 0 20px ${color.body}40`,
          }}
        />
      )}

      {/* Task count badge */}
      {taskCount > 0 && (
        <div
          className="absolute -top-2 -right-1 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center z-20 pointer-events-none"
          style={{ backgroundColor: "#5e6ad2" }}
        >
          <span className="text-[9px] text-white font-bold leading-none">{taskCount}</span>
        </div>
      )}

      <div className="relative mb-[-12px] z-10">
        <Robot color={color} />
        <div
          className={clsx(
            "absolute bottom-0 right-1 w-3 h-3 rounded-full border-2 border-[#0a0a0a]",
            working ? "bg-[#5e6ad2] animate-pulse" : "bg-emerald-500"
          )}
        />
      </div>

      <Desk color={color} working={working} />

      <div className="mt-2 text-center pointer-events-none">
        <p
          className="text-[12px] font-medium leading-tight"
          style={{ color: selected ? color.body : "#f5f5f5" }}
        >
          {agent.name}
        </p>
        {working && currentTask ? (
          <p className="text-[9px] text-[#5e6ad2] max-w-[130px] truncate mt-0.5">
            {currentTask.title}
          </p>
        ) : (
          <p className="text-[9px] text-[#555555] mt-0.5">Idle</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OfficePage() {
  // ── Data state ──────────────────────────────────────────────────────────────
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // ── Canvas state (state for rendering + refs for event handlers) ─────────────
  const [pan, setPan] = useState({ x: 80, y: 60 });
  const [zoom, setZoom] = useState(1);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Refs (always current, safe to use inside event listeners)
  const panRef = useRef({ x: 80, y: 60 });
  const zoomRef = useRef(1);
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const viewportRef = useRef<HTMLDivElement>(null);

  // Interaction refs
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const isDraggingRef = useRef<string | null>(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, nodeX: 0, nodeY: 0 });
  const dragMovedRef = useRef(false);
  const lastPinchDistRef = useRef(0);

  // ── Sync helpers ─────────────────────────────────────────────────────────────
  const updatePan = useCallback((newPan: { x: number; y: number }) => {
    panRef.current = newPan;
    setPan(newPan);
  }, []);

  const updateZoom = useCallback((newZoom: number) => {
    zoomRef.current = newZoom;
    setZoom(newZoom);
  }, []);

  const updatePositions = useCallback((pos: Record<string, { x: number; y: number }>) => {
    positionsRef.current = pos;
    setPositions(pos);
    try { localStorage.setItem("office-robot-positions", JSON.stringify(pos)); } catch {}
  }, []);

  // ── Load saved positions ──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem("office-robot-positions");
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, { x: number; y: number }>;
        positionsRef.current = parsed;
        setPositions(parsed);
      }
    } catch {}
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [agentsRes, tasksRes, actRes] = await Promise.all([
        fetch("/api/deploy-agent"),
        fetch("/api/tasks"),
        fetch("/api/activities?limit=30"),
      ]);
      const agentsData = await agentsRes.json();
      const tasksData = await tasksRes.json();
      const actData = await actRes.json();
      setAgents(agentsData.filter((a: Agent) => a.status === "active"));
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setActivities(Array.isArray(actData) ? actData : []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ── Wheel zoom (non-passive) ──────────────────────────────────────────────────
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      const newZoom = Math.min(3, Math.max(0.3, zoomRef.current * factor));
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldX = (mx - panRef.current.x) / zoomRef.current;
      const worldY = (my - panRef.current.y) / zoomRef.current;
      const newPan = {
        x: mx - worldX * newZoom,
        y: my - worldY * newZoom,
      };
      panRef.current = newPan;
      zoomRef.current = newZoom;
      setPan(newPan);
      setZoom(newZoom);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // ── Mouse event handlers ──────────────────────────────────────────────────────
  const handleViewportMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Don't pan if clicking on a robot card or the agent panel
    if ((e.target as HTMLElement).closest("[data-robot]")) return;
    if ((e.target as HTMLElement).closest("[data-panel]")) return;
    isPanningRef.current = true;
    panStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
    };
    e.preventDefault();
  }, []);

  const handleRobotMouseDown = useCallback(
    (e: React.MouseEvent, agentId: string, index: number) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const pos = positionsRef.current[agentId] ?? defaultPosition(index);
      isDraggingRef.current = agentId;
      dragMovedRef.current = false;
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        nodeX: pos.x,
        nodeY: pos.y,
      };
      setDraggingId(agentId);
      e.preventDefault();
    },
    []
  );

  // Global mouse move / up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.mouseX;
        const dy = e.clientY - panStartRef.current.mouseY;
        const newPan = {
          x: panStartRef.current.panX + dx,
          y: panStartRef.current.panY + dy,
        };
        panRef.current = newPan;
        setPan({ ...newPan });
      } else if (isDraggingRef.current) {
        const id = isDraggingRef.current;
        const dx = e.clientX - dragStartRef.current.mouseX;
        const dy = e.clientY - dragStartRef.current.mouseY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMovedRef.current = true;
        const newPos = {
          ...positionsRef.current,
          [id]: {
            x: dragStartRef.current.nodeX + dx / zoomRef.current,
            y: dragStartRef.current.nodeY + dy / zoomRef.current,
          },
        };
        positionsRef.current = newPos;
        setPositions({ ...newPos });
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        const id = isDraggingRef.current;
        if (!dragMovedRef.current) {
          // Click (not drag) → toggle selection
          setSelectedAgent((prev) => (prev === id ? null : id));
        }
        // Persist positions
        try {
          localStorage.setItem(
            "office-robot-positions",
            JSON.stringify(positionsRef.current)
          );
        } catch {}
        isDraggingRef.current = null;
        setDraggingId(null);
      }
      isPanningRef.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // ── Touch events ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const getPinchDist = (touches: TouchList): number => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        lastPinchDistRef.current = getPinchDist(e.touches);
        // Cancel any ongoing single-touch operation
        isPanningRef.current = false;
        isDraggingRef.current = null;
        setDraggingId(null);
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        const robotEl = (t.target as HTMLElement).closest("[data-robot]");
        if (robotEl) {
          const agentId = robotEl.getAttribute("data-robot")!;
          const indexStr = robotEl.getAttribute("data-index") ?? "0";
          const index = parseInt(indexStr, 10);
          const pos =
            positionsRef.current[agentId] ?? defaultPosition(index);
          isDraggingRef.current = agentId;
          dragMovedRef.current = false;
          dragStartRef.current = {
            mouseX: t.clientX,
            mouseY: t.clientY,
            nodeX: pos.x,
            nodeY: pos.y,
          };
          setDraggingId(agentId);
        } else {
          isPanningRef.current = true;
          panStartRef.current = {
            mouseX: t.clientX,
            mouseY: t.clientY,
            panX: panRef.current.x,
            panY: panRef.current.y,
          };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dist = getPinchDist(e.touches);
        const factor = dist / lastPinchDistRef.current;
        lastPinchDistRef.current = dist;
        const rect = el.getBoundingClientRect();
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const newZoom = Math.min(3, Math.max(0.3, zoomRef.current * factor));
        const worldX = (cx - panRef.current.x) / zoomRef.current;
        const worldY = (cy - panRef.current.y) / zoomRef.current;
        const newPan = { x: cx - worldX * newZoom, y: cy - worldY * newZoom };
        panRef.current = newPan;
        zoomRef.current = newZoom;
        setPan({ ...newPan });
        setZoom(newZoom);
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        if (isDraggingRef.current) {
          const id = isDraggingRef.current;
          const dx = t.clientX - dragStartRef.current.mouseX;
          const dy = t.clientY - dragStartRef.current.mouseY;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMovedRef.current = true;
          const newPos = {
            ...positionsRef.current,
            [id]: {
              x: dragStartRef.current.nodeX + dx / zoomRef.current,
              y: dragStartRef.current.nodeY + dy / zoomRef.current,
            },
          };
          positionsRef.current = newPos;
          setPositions({ ...newPos });
        } else if (isPanningRef.current) {
          const dx = t.clientX - panStartRef.current.mouseX;
          const dy = t.clientY - panStartRef.current.mouseY;
          const newPan = {
            x: panStartRef.current.panX + dx,
            y: panStartRef.current.panY + dy,
          };
          panRef.current = newPan;
          setPan({ ...newPan });
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        if (isDraggingRef.current) {
          const id = isDraggingRef.current;
          if (!dragMovedRef.current) {
            setSelectedAgent((prev) => (prev === id ? null : id));
          }
          try {
            localStorage.setItem(
              "office-robot-positions",
              JSON.stringify(positionsRef.current)
            );
          } catch {}
          isDraggingRef.current = null;
          setDraggingId(null);
        }
        isPanningRef.current = false;
      }
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  // ── Zoom controls ─────────────────────────────────────────────────────────────
  const zoomTowards = useCallback(
    (factor: number) => {
      const el = viewportRef.current;
      const newZoom = Math.min(3, Math.max(0.3, zoomRef.current * factor));
      if (el) {
        const cx = el.clientWidth / 2;
        const cy = el.clientHeight / 2;
        const worldX = (cx - panRef.current.x) / zoomRef.current;
        const worldY = (cy - panRef.current.y) / zoomRef.current;
        const newPan = { x: cx - worldX * newZoom, y: cy - worldY * newZoom };
        updatePan(newPan);
      }
      updateZoom(newZoom);
    },
    [updatePan, updateZoom]
  );

  const fitAll = useCallback(() => {
    if (agents.length === 0) return;
    const el = viewportRef.current;
    if (!el) return;
    const CARD_W = 160;
    const CARD_H = 210;
    const PAD = 60;
    const allPos = agents.map((a, i) => positionsRef.current[a.agent_id] ?? defaultPosition(i));
    const minX = Math.min(...allPos.map((p) => p.x)) - CARD_W / 2 - PAD;
    const minY = Math.min(...allPos.map((p) => p.y)) - CARD_H / 2 - PAD;
    const maxX = Math.max(...allPos.map((p) => p.x)) + CARD_W / 2 + PAD;
    const maxY = Math.max(...allPos.map((p) => p.y)) + CARD_H / 2 + PAD;
    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const viewW = el.clientWidth;
    const viewH = el.clientHeight;
    const newZoom = Math.min(3, Math.max(0.3, Math.min(viewW / worldW, viewH / worldH) * 0.92));
    const newPan = {
      x: (viewW - worldW * newZoom) / 2 - minX * newZoom,
      y: (viewH - worldH * newZoom) / 2 - minY * newZoom,
    };
    updatePan(newPan);
    updateZoom(newZoom);
  }, [agents, updatePan, updateZoom]);

  const resetView = useCallback(() => {
    updatePan({ x: 80, y: 60 });
    updateZoom(1);
  }, [updatePan, updateZoom]);

  // ── Data helpers ──────────────────────────────────────────────────────────────
  function agentCurrentTask(agentId: string): Task | null {
    return tasks.find((t) => t.assignee === agentId && t.status === "in_progress") ?? null;
  }

  function agentTaskCount(agentId: string): number {
    return tasks.filter((t) => t.assignee === agentId && t.status !== "done").length;
  }

  function agentName(id: string): string {
    return agents.find((a) => a.agent_id === id)?.name ?? id;
  }

  async function assignTask(title: string, agentId: string) {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, assignee: agentId, priority: "medium" }),
    });
    loadData();
  }

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const selected = agents.find((a) => a.agent_id === selectedAgent);
  const workingAgents = agents.filter((a) => agentCurrentTask(a.agent_id)).length;
  const activeTasks = tasks.filter((t) => t.status === "in_progress").length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.length;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 7rem)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Office</h1>
          <p className="text-sm text-[#555555] mt-0.5">
            {workingAgents} working · {agents.length - workingAgents} idle · {activeTasks} active task
            {activeTasks !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLoading(true); loadData(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] bg-[#1a1a1a] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] transition-all"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
          <div className="flex items-center gap-3 px-3 py-1.5 bg-[#111111] border border-[#222222] rounded-md">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="text-[11px] text-[#888888]">{doneTasks} done</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#5e6ad2]" />
              <span className="text-[11px] text-[#888888]">{activeTasks} active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-yellow-400" />
              <span className="text-[11px] text-[#888888]">{totalTasks - doneTasks - activeTasks} pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        ref={viewportRef}
        className="flex-1 relative rounded-xl border border-[#1a1a1a] overflow-hidden min-h-0"
        style={{
          background: "#0a0a0a",
          backgroundImage: "radial-gradient(circle, #222222 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          backgroundPosition: `${((pan.x % 24) + 24) % 24}px ${((pan.y % 24) + 24) % 24}px`,
          cursor: draggingId ? "grabbing" : "grab",
          userSelect: "none",
        }}
        onMouseDown={handleViewportMouseDown}
      >
        {/* Canvas world */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {agents.map((agent, i) => {
            const pos = positions[agent.agent_id] ?? defaultPosition(i);
            const isDrag = draggingId === agent.agent_id;
            const currentTask = agentCurrentTask(agent.agent_id);
            const taskCount = agentTaskCount(agent.agent_id);

            return (
              <div
                key={agent.agent_id}
                data-robot={agent.agent_id}
                data-index={i}
                style={{
                  position: "absolute",
                  left: pos.x,
                  top: pos.y,
                  transform: "translate(-50%, -50%)",
                  zIndex: isDrag ? 100 : selectedAgent === agent.agent_id ? 50 : 1,
                  cursor: isDrag ? "grabbing" : "grab",
                }}
                onMouseDown={(e) => handleRobotMouseDown(e, agent.agent_id, i)}
              >
                <AgentNode
                  agent={agent}
                  currentTask={currentTask}
                  taskCount={taskCount}
                  selected={selectedAgent === agent.agent_id}
                  dragging={isDrag}
                />
              </div>
            );
          })}
        </div>

        {/* Loading overlay */}
        {loading && agents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[#555555] text-[13px]">Loading agents…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && agents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[#444444] text-[13px]">No active agents</p>
          </div>
        )}

        {/* Agent detail panel (floating overlay) */}
        {selected && (
          <div
            className="absolute top-4 right-4 z-50"
            data-panel="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <AgentPanel
              agent={selected}
              tasks={tasks}
              activities={activities}
              agents={agents}
              onClose={() => setSelectedAgent(null)}
              onAssign={assignTask}
            />
          </div>
        )}

        {/* Zoom controls (bottom-right) */}
        <div
          className="absolute bottom-4 right-4 flex items-center gap-1 z-40"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => zoomTowards(1.2)}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[#111111] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] hover:bg-[#1a1a1a] transition-all text-[16px] font-medium leading-none"
            title="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => zoomTowards(1 / 1.2)}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[#111111] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] hover:bg-[#1a1a1a] transition-all text-[16px] font-medium leading-none"
            title="Zoom out"
          >
            −
          </button>
          <button
            onClick={fitAll}
            className="h-8 px-2.5 flex items-center justify-center rounded-md bg-[#111111] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] hover:bg-[#1a1a1a] transition-all text-[11px] gap-1"
            title="Fit all agents"
          >
            ⊡ Fit
          </button>
          <button
            onClick={resetView}
            className="h-8 px-2.5 flex items-center justify-center rounded-md bg-[#111111] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] hover:bg-[#1a1a1a] transition-all text-[11px] gap-1"
            title="Reset view"
          >
            ↺ Reset
          </button>
          <div className="ml-1 px-2 h-8 flex items-center rounded-md bg-[#111111] border border-[#1a1a1a] text-[#555555] text-[10px] font-mono min-w-[44px] justify-center">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Hint when no agents yet */}
        {!loading && agents.length > 0 && (
          <div className="absolute bottom-4 left-4 text-[10px] text-[#333333] select-none pointer-events-none">
            Drag to move robots · Scroll to zoom · Click robot to inspect
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="mt-3 flex flex-wrap gap-2 flex-shrink-0">
        {agents.map((agent) => {
          const color = getColor(agent.agent_id);
          const task = agentCurrentTask(agent.agent_id);
          const isSelected = selectedAgent === agent.agent_id;
          return (
            <button
              key={agent.agent_id}
              onClick={() => setSelectedAgent(isSelected ? null : agent.agent_id)}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-md border transition-all text-left min-w-[140px]",
                isSelected
                  ? "bg-[#111111]"
                  : "bg-[#0a0a0a] border-[#1a1a1a] hover:bg-[#111111] hover:border-[#222222]"
              )}
              style={isSelected ? { borderColor: color.body } : {}}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ backgroundColor: `${color.body}20`, color: color.body }}
              >
                {agent.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-[#f5f5f5] truncate">{agent.name}</p>
                <p className="text-[9px] text-[#555555] truncate">
                  {task ? task.title.slice(0, 20) : "Idle"}
                </p>
              </div>
              <div
                className={clsx(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  task ? "bg-[#5e6ad2] animate-pulse" : "bg-emerald-500"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
