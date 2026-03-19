"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge,
  Connection, Edge, Node, MarkerType, Handle, Position, Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import clsx from "clsx";
import { UserPlus, Crown, Bot, Shield, Bug, Save, Loader2, CheckCircle2, User, Link2, Unlink } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Agent {
  agent_id: string; name: string; role: string; model: string; division: string;
  lead: string; skills: string[]; tools: string[]; status: string; personality?: string;
}
interface DbConnection {
  id: string; source_id: string; target_id: string; type: string; label: string;
}

type ConnType = "reports_to" | "synced" | "delegates";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function modelLabel(m: string) { const s = m.replace("anthropic/", ""); return s.includes("opus") ? "Opus 4" : s.includes("sonnet") ? "Sonnet 4" : s.includes("haiku") ? "Haiku 4.5" : s; }
function agentColor(a: { agent_id: string; division?: string }): string {
  if (a.agent_id === "main" || a.agent_id === "user") return "#5e6ad2";
  if (a.division?.includes("Security")) return "#ef4444";
  if (a.division?.includes("QA")) return "#f59e0b";
  if (a.division?.includes("Development")) return "#10b981";
  return "#8b5cf6";
}
function AgentIconEl({ agent }: { agent: { agent_id: string; division?: string } }) {
  if (agent.agent_id === "user") return <User className="w-5 h-5" />;
  if (agent.agent_id === "main") return <Crown className="w-5 h-5" />;
  if (agent.division?.includes("Security")) return <Shield className="w-5 h-5" />;
  if (agent.division?.includes("QA")) return <Bug className="w-5 h-5" />;
  return <Bot className="w-5 h-5" />;
}

const CONN_STYLES: Record<string, { stroke: string; dashArray?: string; animated: boolean; label: string }> = {
  reports_to: { stroke: "#5e6ad2", animated: true, label: "Reports to" },
  synced:     { stroke: "#10b981", dashArray: "6 3", animated: false, label: "Synced" },
  delegates:  { stroke: "#f59e0b", dashArray: "3 3", animated: false, label: "Delegates" },
};

// ─── Custom Nodes ─────────────────────────────────────────────────────────────

function UserNode() {
  return (
    <div className="relative group">
      <Handle type="source" position={Position.Bottom}
        className="!bg-[#5e6ad2] !w-4 !h-4 !border-2 !border-[#0a0a0a] !opacity-40 group-hover:!opacity-100 hover:!scale-150 !transition-all !cursor-crosshair" />
      <Handle type="source" position={Position.Right} id="right"
        className="!bg-[#10b981] !w-3 !h-3 !border-2 !border-[#0a0a0a] !opacity-0 group-hover:!opacity-100 hover:!scale-150 !transition-all !cursor-crosshair" />
      <div className="bg-[#111111] border-2 border-[#5e6ad2]/40 rounded-xl px-6 py-4 text-center min-w-[140px] shadow-lg shadow-[#5e6ad2]/5">
        <div className="w-12 h-12 rounded-full mx-auto mb-2 bg-[#5e6ad2]/20 flex items-center justify-center text-[#5e6ad2] text-lg font-semibold">S</div>
        <div className="text-[14px] font-semibold text-[#f5f5f5]">Samvel</div>
        <div className="text-[10px] text-[#888888] mt-0.5">Human Lead</div>
      </div>
    </div>
  );
}

function AgentNode({ data }: { data: { agent: Agent; selected: boolean } }) {
  const { agent, selected } = data;
  const color = agentColor(agent);
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top}
        className="!bg-emerald-500 !w-4 !h-4 !border-2 !border-[#0a0a0a] !opacity-30 group-hover:!opacity-100 hover:!scale-150 !transition-all !cursor-crosshair" />
      <Handle type="source" position={Position.Bottom}
        className="!bg-[#5e6ad2] !w-4 !h-4 !border-2 !border-[#0a0a0a] !opacity-30 group-hover:!opacity-100 hover:!scale-150 !transition-all !cursor-crosshair" />
      <Handle type="target" position={Position.Left} id="left"
        className="!bg-[#10b981] !w-3 !h-3 !border-2 !border-[#0a0a0a] !opacity-0 group-hover:!opacity-100 hover:!scale-150 !transition-all !cursor-crosshair" />
      <Handle type="source" position={Position.Right} id="right"
        className="!bg-[#10b981] !w-3 !h-3 !border-2 !border-[#0a0a0a] !opacity-0 group-hover:!opacity-100 hover:!scale-150 !transition-all !cursor-crosshair" />
      <div className={clsx("bg-[#111111] rounded-xl px-5 py-4 text-center min-w-[160px] transition-all shadow-lg border-2")}
        style={{ borderColor: selected ? color : `${color}40`, boxShadow: selected ? `0 0 20px ${color}20` : `0 4px 12px rgba(0,0,0,0.3)` }}>
        <div className="w-11 h-11 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
          <AgentIconEl agent={agent} />
        </div>
        <div className="text-[13px] font-semibold text-[#f5f5f5]">{agent.name}</div>
        <div className="text-[10px] text-[#888888] mt-0.5 leading-snug line-clamp-1 max-w-[150px]">{agent.role.split("—")[0].trim()}</div>
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${color}15`, color }}>{modelLabel(agent.model)}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { userNode: UserNode, agentNode: AgentNode };

// ─── Build nodes & edges from agents + connections ────────────────────────────

function buildGraph(agents: Agent[], connections: DbConnection[]) {
  const active = agents.filter((a) => a.status !== "retired");
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let saved: Record<string, { x: number; y: number }> = {};
  try { const s = localStorage.getItem("mc-team-positions"); if (s) saved = JSON.parse(s); } catch {}

  // User node
  nodes.push({ id: "user", type: "userNode", position: saved["user"] || { x: 400, y: 0 }, data: {}, draggable: true });

  // Agent nodes
  const spacing = 220;
  const main = active.find((a) => a.agent_id === "main");
  if (main) {
    nodes.push({ id: main.agent_id, type: "agentNode", position: saved[main.agent_id] || { x: 375, y: 150 }, data: { agent: main, selected: false }, draggable: true });
  }

  const others = active.filter((a) => a.agent_id !== "main");
  const startX = 400 - ((others.length - 1) * spacing) / 2;
  others.forEach((agent, idx) => {
    const hasLeadConnection = connections.some((c) => c.target_id === agent.agent_id && c.type === "reports_to" && c.source_id !== "main");
    const defaultY = hasLeadConnection ? 550 : 350;
    nodes.push({
      id: agent.agent_id, type: "agentNode",
      position: saved[agent.agent_id] || { x: startX + idx * spacing, y: defaultY },
      data: { agent, selected: false }, draggable: true,
    });
  });

  // Edges from connections
  connections.forEach((conn) => {
    const style = CONN_STYLES[conn.type] || CONN_STYLES.synced;
    const sourceAgent = agents.find((a) => a.agent_id === conn.source_id);
    const color = sourceAgent ? agentColor(sourceAgent) : style.stroke;

    edges.push({
      id: conn.id,
      source: conn.source_id,
      target: conn.target_id,
      sourceHandle: conn.type === "synced" ? "right" : undefined,
      targetHandle: conn.type === "synced" ? "left" : undefined,
      type: "smoothstep",
      animated: style.animated,
      style: { stroke: conn.type === "reports_to" ? `${color}80` : style.stroke, strokeWidth: 2, strokeDasharray: style.dashArray },
      markerEnd: { type: MarkerType.ArrowClosed, color: conn.type === "reports_to" ? `${color}80` : style.stroke, width: 12, height: 12 },
      label: conn.label || (conn.type !== "reports_to" ? style.label : ""),
      labelStyle: { fill: "#888888", fontSize: 10 },
      labelBgStyle: { fill: "#111111", fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number],
      data: { connType: conn.type, connId: conn.id },
    });
  });

  return { nodes, edges };
}

// ─── Connection Type Picker ───────────────────────────────────────────────────

function ConnTypePicker({ onSelect, onClose }: { onSelect: (type: ConnType, label: string) => void; onClose: () => void }) {
  const [label, setLabel] = useState("");

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 w-64 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-[#f5f5f5]">Connection Type</h3>
        <button onClick={onClose} className="text-[#555555] hover:text-[#888888]">✕</button>
      </div>
      <div className="space-y-2">
        {(Object.entries(CONN_STYLES) as [ConnType, any][]).map(([type, style]) => (
          <button key={type} onClick={() => onSelect(type, label)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[#222222] hover:border-[#333333] transition-all text-left">
            <div className="w-8 flex items-center">
              <svg width="32" height="4"><line x1="0" y1="2" x2="32" y2="2" stroke={style.stroke} strokeWidth="2" strokeDasharray={style.dashArray || "none"} /></svg>
            </div>
            <div>
              <div className="text-[12px] font-medium text-[#f5f5f5]">{style.label}</div>
              <div className="text-[10px] text-[#555555]">
                {type === "reports_to" ? "Hierarchy — who manages who" :
                 type === "synced" ? "Collaboration — share info both ways" :
                 "Delegation — one-way task flow"}
              </div>
            </div>
          </button>
        ))}
      </div>
      <input className="w-full bg-[#0a0a0a] border border-[#222222] rounded-lg px-3 py-1.5 text-[12px] text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-[#5e6ad2]"
        placeholder="Optional label..." value={label} onChange={(e) => setLabel(e.target.value)} />
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ agent, agents, connections, onClose }: { agent: Agent; agents: Agent[]; connections: DbConnection[]; onClose: () => void }) {
  const color = agentColor(agent);
  const reportsTo = connections.filter((c) => c.target_id === agent.agent_id && c.type === "reports_to");
  const subordinates = connections.filter((c) => c.source_id === agent.agent_id && c.type === "reports_to");
  const synced = connections.filter((c) => (c.source_id === agent.agent_id || c.target_id === agent.agent_id) && c.type === "synced");
  const delegates = connections.filter((c) => c.source_id === agent.agent_id && c.type === "delegates");

  const getName = (id: string) => id === "user" ? "Samvel" : agents.find((a) => a.agent_id === id)?.name || id;

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-lg p-4 w-72 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
            <AgentIconEl agent={agent} />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#f5f5f5]">{agent.name}</div>
            <div className="text-[10px] text-[#555555] font-mono">{agent.agent_id}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-[#555555] hover:text-[#888888]">✕</button>
      </div>

      <p className="text-[11px] text-[#888888] leading-relaxed">{agent.role}</p>

      {/* Connections summary */}
      <div className="space-y-2">
        {reportsTo.length > 0 && (
          <div>
            <p className="text-[10px] text-[#555555] font-medium mb-1">📋 Reports to</p>
            {reportsTo.map((c) => (
              <span key={c.id} className="text-[11px] px-2 py-0.5 rounded-full bg-[#5e6ad2]/10 text-[#5e6ad2]">{getName(c.source_id)}</span>
            ))}
          </div>
        )}
        {subordinates.length > 0 && (
          <div>
            <p className="text-[10px] text-[#555555] font-medium mb-1">👥 Manages</p>
            <div className="flex flex-wrap gap-1">
              {subordinates.map((c) => (
                <span key={c.id} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a1a] text-[#888888]">{getName(c.target_id)}</span>
              ))}
            </div>
          </div>
        )}
        {synced.length > 0 && (
          <div>
            <p className="text-[10px] text-[#555555] font-medium mb-1">🔗 Synced with</p>
            <div className="flex flex-wrap gap-1">
              {synced.map((c) => {
                const otherId = c.source_id === agent.agent_id ? c.target_id : c.source_id;
                return <span key={c.id} className="text-[10px] px-2 py-0.5 rounded-full bg-[#10b981]/10 text-[#10b981]">{getName(otherId)}</span>;
              })}
            </div>
          </div>
        )}
        {delegates.length > 0 && (
          <div>
            <p className="text-[10px] text-[#555555] font-medium mb-1">➡️ Delegates to</p>
            <div className="flex flex-wrap gap-1">
              {delegates.map((c) => (
                <span key={c.id} className="text-[10px] px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b]">{getName(c.target_id)}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <Link href="/agents" className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md text-[11px] bg-[#1a1a1a] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] hover:border-[#333333] transition-all">
        Edit in Agents →
      </Link>
    </div>
  );
}

// ─── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="bg-[#111111]/90 border border-[#222222] rounded-lg px-3 py-2 flex items-center gap-4">
      {(Object.entries(CONN_STYLES) as [string, any][]).map(([type, style]) => (
        <div key={type} className="flex items-center gap-1.5">
          <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke={style.stroke} strokeWidth="2" strokeDasharray={style.dashArray || "none"} /></svg>
          <span className="text-[10px] text-[#888888]">{style.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [connections, setConnections] = useState<DbConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pendingConn, setPendingConn] = useState<{ source: string; target: string } | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const loadData = useCallback(async () => {
    const [agentsRes, connRes] = await Promise.all([
      fetch("/api/deploy-agent").then((r) => r.json()).catch(() => []),
      fetch("/api/connections").then((r) => r.json()).catch(() => []),
    ]);
    const active = agentsRes.filter((a: Agent) => a.status !== "retired");
    setAgents(active);
    setConnections(connRes);
    const { nodes: n, edges: e } = buildGraph(active, connRes);
    setNodes(n);
    setEdges(e);
    setLoading(false);
  }, [setNodes, setEdges]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle new connection — show type picker
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.target === "user" || connection.source === connection.target) return;
    setPendingConn({ source: connection.source, target: connection.target });
  }, []);

  const createConnection = useCallback(async (type: ConnType, label: string) => {
    if (!pendingConn) return;
    await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId: pendingConn.source, targetId: pendingConn.target, type, label }),
    });
    setPendingConn(null);
    loadData();
  }, [pendingConn, loadData]);

  // Click edge to delete
  const onEdgeClick = useCallback(async (_: any, edge: Edge) => {
    const connType = (edge.data as any)?.connType || "reports_to";
    const style = CONN_STYLES[connType] || CONN_STYLES.synced;
    if (confirm(`Remove ${style.label} connection: ${edge.source} → ${edge.target}?`)) {
      await fetch("/api/connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: (edge.data as any)?.connId || edge.id }),
      });
      loadData();
    }
  }, [loadData]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.id === "user") { setSelectedAgent(null); return; }
    const agent = agents.find((a) => a.agent_id === node.id);
    setSelectedAgent(agent || null);
    setNodes((nds) => nds.map((n) => ({
      ...n, data: n.type === "agentNode" ? { ...n.data, selected: n.id === node.id } : n.data,
    })));
  }, [agents, setNodes]);

  const savePositions = useCallback(() => {
    setSaving(true);
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => { positions[n.id] = n.position; });
    localStorage.setItem("mc-team-positions", JSON.stringify(positions));
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }, 300);
  }, [nodes]);

  const activeCount = agents.filter((a) => a.status === "active").length;

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      <div className="flex items-center justify-between px-1 py-2 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Team Canvas</h1>
          <p className="text-sm text-[#555555] mt-0.5">
            {loading ? "Loading…" : `${activeCount} agents · ${connections.length} connections · drag handles to connect · click edge to remove`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={savePositions} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] bg-[#1a1a1a] border border-[#222222] text-[#888888] hover:text-[#f5f5f5] transition-all disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? "Saved" : "Save Layout"}
          </button>
          <Link href="/agents" className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium">
            <UserPlus className="w-3.5 h-3.5" /> New Agent
          </Link>
        </div>
      </div>

      <div className="flex-1 rounded-lg border border-[#1a1a1a] overflow-hidden relative">
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect} onNodeClick={onNodeClick} onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3} maxZoom={2} snapToGrid snapGrid={[20, 20]}
          connectionLineStyle={{ stroke: "#5e6ad2", strokeWidth: 2 }}
          connectionLineType={"smoothstep" as any}
          defaultEdgeOptions={{ type: "smoothstep", animated: false }}
          proOptions={{ hideAttribution: true }}
          style={{ background: "#0a0a0a" }}
        >
          <Background color="#1a1a1a" gap={30} size={1} />
          <Controls showInteractive={false}
            className="!bg-[#111111] !border-[#222222] !rounded-md !shadow-lg [&>button]:!bg-[#111111] [&>button]:!border-[#222222] [&>button]:!text-[#888888] [&>button:hover]:!bg-[#1a1a1a]" />
          <MiniMap nodeColor={(node) => {
            if (node.id === "user") return "#5e6ad2";
            const a = agents.find((x) => x.agent_id === node.id);
            return a ? agentColor(a) : "#555555";
          }} className="!bg-[#111111] !border-[#222222] !rounded-md" maskColor="rgba(0,0,0,0.7)" />

          {/* Legend */}
          <Panel position="bottom-left"><Legend /></Panel>

          {/* Connection type picker */}
          {pendingConn && (
            <Panel position="top-center">
              <ConnTypePicker
                onSelect={(type, label) => createConnection(type, label)}
                onClose={() => setPendingConn(null)}
              />
            </Panel>
          )}

          {/* Detail panel */}
          {selectedAgent && (
            <Panel position="top-right">
              <DetailPanel agent={selectedAgent} agents={agents} connections={connections}
                onClose={() => { setSelectedAgent(null); setNodes((nds) => nds.map((n) => ({ ...n, data: n.type === "agentNode" ? { ...n.data, selected: false } : n.data }))); }} />
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}
