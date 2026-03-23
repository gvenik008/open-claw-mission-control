"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Brain, FileText, BookOpen, ChevronRight, Database, Clock, HardDrive, Edit2, Save, X, Plus, Loader2 } from "lucide-react";

interface MemoryFile {
  path: string;
  name: string;
  agent: string;
  agentName?: string;
  type: "config" | "daily" | "agent-config" | "agent-daily" | "lesson";
  size: number;
  modified: string;
}

interface DBMemory {
  id: string;
  agent_id: string;
  type: string;
  content: string;
  tags: string;
  source: string;
  created_at: string;
}

interface FileContent {
  path: string;
  content: string;
  size: number;
  modified: string;
}

interface Agent {
  agent_id: string;
  name: string;
  status: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  config: { label: "Config", color: "bg-purple-500/10 text-purple-400 border border-purple-500/20" },
  daily: { label: "Daily", color: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  "agent-config": { label: "Agent Config", color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  "agent-daily": { label: "Agent Daily", color: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" },
  lesson: { label: "Lesson", color: "bg-orange-500/10 text-orange-400 border border-orange-500/20" },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

function formatRelative(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Simple markdown renderer
function renderMarkdown(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre key={key++} className="bg-[#0a0a0a] border border-[#222222] rounded-md px-4 py-3 my-3 overflow-x-auto text-[12px] text-[#aaa] font-mono">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} className="text-[14px] font-semibold text-[#f5f5f5] mt-4 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-[15px] font-semibold text-[#f5f5f5] mt-5 mb-2 border-b border-[#222222] pb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={key++} className="text-[16px] font-bold text-[#f5f5f5] mt-4 mb-2">{line.slice(2)}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={key++} className="text-[13px] text-[#888888] ml-4 my-0.5 list-disc">
          {line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1")}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(
        <p key={key++} className="text-[13px] text-[#888888] my-1 leading-relaxed">
          {line.replace(/\*\*(.*?)\*\*/g, "$1")}
        </p>
      );
    }
    i++;
  }
  return elements;
}

export default function MemoryPage() {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [dbMemories, setDbMemories] = useState<DBMemory[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedFile, setSelectedFile] = useState<MemoryFile | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [savingFile, setSavingFile] = useState(false);

  // Add Note modal state
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteAgent, setNoteAgent] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [memRes, agentsRes] = await Promise.all([
        fetch("/api/memory?include=lessons"),
        fetch("/api/deploy-agent"),
      ]);
      const data = await memRes.json();
      const agentsData = await agentsRes.json();
      setFiles(data.files || []);
      setDbMemories(data.dbMemories || []);
      setAgents(Array.isArray(agentsData) ? agentsData : []);
    } catch {}
    setLoading(false);
  }, []);

  const loadFile = useCallback(async (file: MemoryFile) => {
    setSelectedFile(file);
    setEditMode(false);
    setEditContent("");
    setContentLoading(true);
    try {
      const res = await fetch(`/api/memory?path=${encodeURIComponent(file.path)}`);
      const data = await res.json();
      setFileContent(data);
    } catch {}
    setContentLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function enterEditMode() {
    if (!fileContent) return;
    setEditContent(fileContent.content);
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setEditContent("");
  }

  async function saveFile() {
    if (!selectedFile) return;
    setSavingFile(true);
    try {
      const res = await fetch("/api/memory/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedFile.path, content: editContent }),
      });
      if (res.ok) {
        setFileContent((prev) => prev ? { ...prev, content: editContent } : prev);
        setEditMode(false);
        setEditContent("");
        await load();
      }
    } catch {}
    setSavingFile(false);
  }

  async function saveNote() {
    if (!noteContent.trim()) return;
    setSavingNote(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const agentLabel = noteAgent
        ? (agents.find((a) => a.agent_id === noteAgent)?.name || noteAgent)
        : "Note";
      const header = `\n## ${agentLabel} — ${today}\n`;
      const fullNote = header + noteContent;

      const path = `memory/${today}.md`;
      await fetch("/api/memory/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: fullNote, append: true }),
      });
      setShowAddNote(false);
      setNoteContent("");
      setNoteAgent("");
      await load();
    } catch {}
    setSavingNote(false);
  }

  const filteredFiles = files.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.agentName || f.agent).toLowerCase().includes(search.toLowerCase())
  );

  // Group files by agent
  const grouped: Record<string, MemoryFile[]> = {};
  for (const f of filteredFiles) {
    const key = f.agentName || (f.agent === "main" ? "Main (Gvenik)" : f.agent);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-[#222222] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#222222]">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Memory</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAddNote(true)}
                className="p-1.5 hover:bg-[#1a1a1a] rounded transition-colors text-[#555555] hover:text-[#888888]"
                title="Add Note"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button onClick={load} className="p-1.5 hover:bg-[#1a1a1a] rounded transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 text-[#555555] ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#222222] rounded-md px-3 py-1.5 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] outline-none focus:border-[#333333]"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {Object.entries(grouped).map(([groupName, groupFiles]) => (
            <div key={groupName} className="mb-4">
              <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                <Brain className="w-3 h-3 text-[#444444]" />
                <span className="text-[10px] uppercase tracking-wider text-[#444444] font-medium">{groupName}</span>
              </div>
              {groupFiles.map((file) => {
                const typeCfg = TYPE_CONFIG[file.type] || TYPE_CONFIG["daily"];
                const isSelected = selectedFile?.path === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => loadFile(file)}
                    className={`w-full text-left px-3 py-2 rounded-md mb-0.5 transition-colors ${
                      isSelected ? "bg-[#5e6ad2]/10 border border-[#5e6ad2]/20" : "hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className={`w-3 h-3 shrink-0 ${isSelected ? "text-[#5e6ad2]" : "text-[#444444]"}`} />
                      <span className="text-[12px] text-[#f5f5f5] truncate flex-1">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 ml-5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${typeCfg.color}`}>{typeCfg.label}</span>
                      <span className="text-[10px] text-[#444444]">{formatSize(file.size)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* DB Memories count */}
        <div className="border-t border-[#222222] p-3">
          <div className="flex items-center gap-2 text-[11px] text-[#555555]">
            <Database className="w-3 h-3" />
            <span>{dbMemories.length} DB memories</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedFile && fileContent ? (
          <>
            <div className="border-b border-[#222222] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-medium text-[#f5f5f5]">{selectedFile.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${(TYPE_CONFIG[selectedFile.type] || TYPE_CONFIG["daily"]).color}`}>
                    {(TYPE_CONFIG[selectedFile.type] || TYPE_CONFIG["daily"]).label}
                  </span>
                  <span className="text-[11px] text-[#555555] flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />{formatSize(fileContent.size)}
                  </span>
                  <span className="text-[11px] text-[#555555] flex items-center gap-1">
                    <Clock className="w-3 h-3" />{formatRelative(fileContent.modified)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <>
                    <button
                      onClick={enterEditMode}
                      className="flex items-center gap-1.5 text-xs text-[#555555] hover:text-[#888888] transition-colors px-2 py-1.5 hover:bg-[#1a1a1a] rounded-md"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => { setSelectedFile(null); setFileContent(null); setEditMode(false); }}
                      className="text-[12px] text-[#555555] hover:text-[#f5f5f5] transition-colors px-2 py-1.5 hover:bg-[#1a1a1a] rounded-md"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={cancelEdit}
                      className="text-xs text-[#555555] hover:text-[#888888] transition-colors px-2 py-1.5 hover:bg-[#1a1a1a] rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveFile}
                      disabled={savingFile}
                      className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium disabled:opacity-50"
                    >
                      {savingFile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {contentLoading ? (
                <div className="flex items-center gap-2 text-[#555555]">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-[13px]">Loading...</span>
                </div>
              ) : editMode ? (
                <div className="max-w-3xl">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-[60vh] bg-[#0a0a0a] border border-[#222222] rounded-md px-4 py-3 text-[13px] text-[#f5f5f5] font-mono focus:outline-none focus:border-[#5e6ad2] resize-none transition-colors"
                    spellCheck={false}
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={cancelEdit}
                      className="bg-[#222222] hover:bg-[#2a2a2a] text-[#ccc] text-xs rounded-md px-3 py-1.5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveFile}
                      disabled={savingFile}
                      className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium disabled:opacity-50"
                    >
                      {savingFile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl">{renderMarkdown(fileContent.content)}</div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            {!selectedFile ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <BookOpen className="w-10 h-10 text-[#333333] mx-auto mb-3" />
                  <p className="text-[13px] text-[#555555]">Select a file to view its contents</p>
                  <p className="text-[11px] text-[#444444] mt-1">{files.length} files available</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-6 text-[#555555]">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-[13px]">Loading file...</span>
              </div>
            )}

            {/* DB Memories section */}
            {dbMemories.length > 0 && (
              <div className="border-t border-[#222222] p-6">
                <h3 className="text-[13px] font-medium text-[#f5f5f5] mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#5e6ad2]" />
                  Knowledge Base ({dbMemories.length} entries)
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dbMemories.map((mem) => (
                    <div key={mem.id} className="bg-[#111111] border border-[#222222] rounded-md p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-[#5e6ad2]">{mem.type}</span>
                        <span className="text-[10px] text-[#444444]">{mem.agent_id}</span>
                        <span className="text-[10px] text-[#444444] ml-auto">{formatRelative(mem.created_at)}</span>
                      </div>
                      <p className="text-[12px] text-[#888888] line-clamp-2">{mem.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      {showAddNote && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddNote(false); }}
        >
          <div className="bg-[#111111] border border-[#222222] rounded-md w-full max-w-md mx-4 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#f5f5f5]">Add Note</h2>
              <button onClick={() => setShowAddNote(false)} className="text-[#555555] hover:text-[#888888]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Agent (optional)</label>
                <select
                  value={noteAgent}
                  onChange={(e) => setNoteAgent(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]"
                >
                  <option value="">General Note</option>
                  {agents.map((a) => (
                    <option key={a.agent_id} value={a.agent_id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Note *</label>
                <textarea
                  autoFocus
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write your note here..."
                  rows={5}
                  className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2] resize-none"
                />
                <p className="text-[10px] text-[#444444] mt-1">
                  Will be appended to memory/{new Date().toISOString().split("T")[0]}.md
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowAddNote(false)}
                className="bg-[#222222] hover:bg-[#2a2a2a] text-[#ccc] text-xs rounded-md px-3 py-1.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveNote}
                disabled={savingNote || !noteContent.trim()}
                className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors font-medium disabled:opacity-50"
              >
                {savingNote && <Loader2 className="w-3 h-3 animate-spin" />}
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
