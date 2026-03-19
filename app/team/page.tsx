"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  Handle,
  Position,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import clsx from "clsx";
import {
  UserPlus,
  Crown,
  Bot,
  Shield,
  Bug,
  Cpu,
  Save,
  Loader2,
  CheckCircle2,
  User,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  agent_id: string;
  name: string;
  role: string;
  model: string;
  division: string;
  lead: string;
  skills: string[];
  tools: string[];
  status: string;
  personality?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function modelLabel(model: string) {
  const m = model.replace("anthropic/", "");
  if (m.includes("opus")) return "Opus 4";
  if (m.includes("sonnet")) return "Sonnet 4";
  if (m.includes("haiku")) return "Haiku 4.5";
  return m;
}

function agentColor(agent: { agent_id: string; division?: string }): string {
  if (agent.agent_id === "main" || agent.agent_id === "user") return "#5e6ad2";
  if (agent.division?.includes("Security")) return "#ef4444";
  if (agent.division?.includes("QA")) return "#f59e0b";
  if (agent.division?.includes("Development")) return "#10b981";
  if (agent.division?.includes("DevOps")) return "#06b6d4";
  return "#8b5cf6";
}

function AgentIcon({ agent }: { agent: { agent_id: string; division?: string } }) {
  if (agent.agent_id === "user") return <User className="w-5 h-5" />;
  if (agent.agent_id === "main") return <Crown className="w-5 h-5" />;
  if (agent.division?.includes("Security")) return <Shield className="w-5 h-5" />;
  if (agent.division?.includes("QA")) return <Bug className="w-5 h-5" />;
  return <Bot className="w-5 h-5" />;
}

// ─── Custom Node: User ────────────────────────────────────────────────────────

function UserNode() {
  return (
    <div className="relative">
      <Handle type="source" position={Position.Bottom} className="!bg-[#5e6ad2] !w-3 !h-3 !border-2 !border-[#0a0a0a]" />
      <div className="bg-[#111111] border-2 border-[#5e6ad2]/40 rounded-xl px-6 py-4 text-center min-w-[140px] shadow-lg shadow-[#5e6ad2]/5">
        <div className="w-12 h-12 rounded-full mx-auto mb-2 bg-[#5e6ad2]/20 flex items-center justify-center text-[#5e6ad2] text-lg font-semibold">
          S
        </div>
        <div className="text-[14px] font-semibold text-[#f5f5f5]">Samvel</div>
        <div className="text-[10px] text-[#888888] mt-0.5">Human Lead</div>
      </div>
    </div>
  );
}

// ─── Custom Node: Agent ───────────────────────────────────────────────────────

function AgentNode({ data }: { data: { agent: Agent; selected: boolean } }) {
  const { agent, selected } = data;
  const color = agentColor(agent);
  const isMain = agent.agent_id === "main";

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-[#555555] !w-3 !h-3 !border-2 !border-[#0a0a0a]" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#555555] !w-3 !h-3 !border-2 !border-[#0a0a0a]" />
      <div
        className={clsx(
          "bg-[#111111] rounded-xl px-5 py-4 text-center min-w-[160px] transition-all shadow-lg",
          selected ? "border-2" : "border-2"
        )}
        style={{
          borderColor: selected ? color : `${color}40`,
          boxShadow: selected ? `0 0 20px ${color}20` : `0 4px 12px rgba(0,0,0,0.3)`,
        }}
      >
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full mx-auto mb-2 flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <AgentIcon agent={agent} />
        </div>

        {/* Name */}
        <div className="text-[13px] font-semibold text-[#f5f5f5]">{agent.name}</div>

        {/* Role (short) */}
        <div className="text-[10px] text-[#888888] mt-0.5 leading-snug line-clamp-1 max-w-[150px]">
          {agent.role.split("—")[0].trim()}
        </div>

        {/* Badges */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {modelLabel(agent.model)}
          </span>
          {agent.status === "active" && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
        </div>

        {/* Stats */}
        {(agent.skills?.length > 0 || agent.tools?.length > 0) && (
          <div className="flex items-center justify-center gap-2 mt-1.5">
            {agent.skills?.length > 0 && (
              <span className="text-[9px] text-[#555555]">{agent.skills.length}s</span>
            )}
            {agent.tools?.length > 0 && (
              <span className="text-[9px] text-[#555555]">{agent.tools.length}t</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Node types ───────────────────────────────────────────────────────────────

const nodeTypes = {
  userNode: UserNode,
  agentNode: AgentNode,
};

// ─── Layout helpers ───────────────────────────────────────────────────────────

function buildNodesAndEdges(agents: Agent[]): { nodes: Node[]; edges: Edge[] } {
  const active = agents.filter((a) => a.status !== "retired");
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Check localStorage for saved positions
  let savedPositions: Record<string, { x: number; y: number }> = {};
  try {
    const saved = localStorage.getItem("mc-team-positions");
    if (saved) savedPositions = JSON.parse(saved);
  } catch {}

  // User node at top
  nodes.push({
    id: "user",
    type: "userNode",
    position: savedPositions["user"] || { x: 400, y: 0 },
    data: {},
    draggable: true,
  });

  // Main agent
  const main = active.find((a) => a.agent_id === "main");
  if (main) {
    nodes.push({
      id: main.agent_id,
      type: "agentNode",
      position: savedPositions[main.agent_id] || { x: 375, y: 150 },
      data: { agent: main, selected: false },
      draggable: true,
    });
    edges.push({
      id: "user-main",
      source: "user",
      target: "main",
      type: "smoothstep",
      animated: true,
      style: { stroke: "#5e6ad2", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#5e6ad2", width: 15, height: 15 },
    });
  }

  // Other agents
  const others = active.filter((a) => a.agent_id !== "main");
  const spacing = 220;
  const startX = 400 - ((others.length - 1) * spacing) / 2;

  others.forEach((agent, idx) => {
    const defaultPos = { x: startX + idx * spacing, y: 350 };
    // Agents under qa-lead get pushed down
    const lead = agent.lead || "main";
    if (lead !== "main" && lead !== "user") {
      defaultPos.y = 550;
    }

    nodes.push({
      id: agent.agent_id,
      type: "agentNode",
      position: savedPositions[agent.agent_id] || defaultPos,
      data: { agent, selected: false },
      draggable: true,
    });

    const source = lead === "user" ? "user" : (active.find((a) => a.agent_id === lead) ? lead : "main");
    const color = agentColor(agent);
    edges.push({
      id: `${source}-${agent.agent_id}`,
      source,
      target: agent.agent_id,
      type: "smoothstep",
      animated: false,
      style: { stroke: `${color}80`, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: `${color}80`, width: 12, height: 12 },
    });
  });

  return { nodes, edges };
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ agent, agents, onClose }: { agent: Agent; agents: Agent[]; onClose: () => void }) {
  const color = agentColor(agent);
  const reportsTo = agents.find((a) => a.agent_id === agent.lead);
  const subordinates = agents.filter((a) => a.lead === agent.agent_id && a.agent_id !== agent.agent_id && a.status === "active");

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-lg p-4 w-72 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <AgentIcon agent={agent} />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#f5f5f5]">{agent.name}</div>
            <div className="text-[10px] text-[#555555] font-mono">{agent.agent_id}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-[#555555] hover:text-[#888888] text-[13px]">✕</button>
      </div>

      <p className="text-[11px] text-[#888888] leading-relaxed">{agent.role}</p>

      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-[10px] text-[#555555]">Model</span>
          <span className="text-[10px] text-[#f5f5f5]">{modelLabel(agent.model)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-[#555555]">Division</span>
          <span className="text-[10px] text-[#f5f5f5]">{agent.division === "none" ? "Core" : agent.division}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-[#555555]">Reports to</span>
          <span className="text-[10px] text-[#f5f5f5]">{reportsTo?.name || "User (Samvel)"}</span>
        </div>
      </div>

      {subordinates.length > 0 && (
        <div>
          <span className="text-[10px] text-[#555555]">Manages:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {subordinates.map((s) => (
              <span key={s.agent_id} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#888888]">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {agent.skills?.length > 0 && (
        <div>
          <span className="text-[10px] text-[#555555]">Skills ({agent.skills.length}):</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {agent.skills.slice(0, 6).map((s) => (
              <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#1a1a1a] text-[#888888]">{s}</span>
            ))}
            {agent.skills.length > 6 && (
              <span className="text-[9px] text-[#555555]">+{agent.skills.length - 6}</span>
            )}
          </div>
        </div>
      )}

      <Link
        href="/agents"
        className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md text-[11px] bg-[#1a1a1a] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] transition-all"
      >
        Edit in Agents →
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    fetch("/api/deploy-agent")
      .then((r) => r.json())
      .then((data: Agent[]) => {
        const active = data.filter((a) => a.status !== "retired");
        setAgents(active);
        const { nodes: n, edges: e } = buildNodesAndEdges(active);
        setNodes(n);
        setEdges(e);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Handle new connections (draw edge = change hierarchy)
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // Update the target agent's lead to the source agent
      const targetId = connection.target;
      const sourceId = connection.source;

      // Don't connect to self or user node as target
      if (targetId === "user" || targetId === sourceId) return;

      const color = agentColor(agents.find((a) => a.agent_id === targetId) || { agent_id: targetId });

      // Remove old edges pointing to this target
      setEdges((eds) => {
        const filtered = eds.filter((e) => e.target !== targetId);
        return addEdge(
          {
            ...connection,
            type: "smoothstep",
            style: { stroke: `${color}80`, strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: `${color}80`, width: 12, height: 12 },
          },
          filtered
        );
      });

      // Update agent's lead in DB
      if (targetId !== "main") {
        const newLead = sourceId === "user" ? "user" : sourceId;
        fetch("/api/deploy-agent", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: targetId, reportsTo: newLead }),
        });
      }
    },
    [agents, setEdges]
  );

  // Click node to select
  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      if (node.id === "user") {
        setSelectedAgent(null);
        return;
      }
      const agent = agents.find((a) => a.agent_id === node.id);
      setSelectedAgent(agent || null);

      // Highlight selected node
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: n.type === "agentNode" ? { ...n.data, selected: n.id === node.id } : n.data,
        }))
      );
    },
    [agents, setNodes]
  );

  // Save positions
  const savePositions = useCallback(() => {
    setSaving(true);
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      positions[n.id] = n.position;
    });
    localStorage.setItem("mc-team-positions", JSON.stringify(positions));
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 300);
  }, [nodes]);

  const activeCount = agents.filter((a) => a.status === "active").length;

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-2 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Team</h1>
          <p className="text-sm text-[#555555] mt-0.5">
            {loading ? "Loading…" : `${activeCount} agents · drag to move, connect handles to change hierarchy`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={savePositions}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] bg-[#1a1a1a] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saved ? "Saved" : "Save Layout"}
          </button>
          <Link
            href="/agents"
            className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium"
          >
            <UserPlus className="w-3.5 h-3.5" />
            New Agent
          </Link>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 rounded-lg border border-[#1a1a1a] overflow-hidden relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: false,
          }}
          proOptions={{ hideAttribution: true }}
          style={{ background: "#0a0a0a" }}
        >
          <Background color="#1a1a1a" gap={30} size={1} />
          <Controls
            showInteractive={false}
            className="!bg-[#111111] !border-[#222222] !rounded-md !shadow-lg [&>button]:!bg-[#111111] [&>button]:!border-[#222222] [&>button]:!text-[#888888] [&>button:hover]:!bg-[#1a1a1a]"
          />
          <MiniMap
            nodeColor={(node) => {
              if (node.id === "user") return "#5e6ad2";
              const agent = agents.find((a) => a.agent_id === node.id);
              return agent ? agentColor(agent) : "#555555";
            }}
            className="!bg-[#111111] !border-[#222222] !rounded-md"
            maskColor="rgba(0,0,0,0.7)"
          />

          {/* Detail panel */}
          {selectedAgent && (
            <Panel position="top-right">
              <DetailPanel
                agent={selectedAgent}
                agents={agents}
                onClose={() => {
                  setSelectedAgent(null);
                  setNodes((nds) =>
                    nds.map((n) => ({
                      ...n,
                      data: n.type === "agentNode" ? { ...n.data, selected: false } : n.data,
                    }))
                  );
                }}
              />
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}
