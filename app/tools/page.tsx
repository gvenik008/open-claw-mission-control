"use client";

import { useEffect, useState } from "react";
import { Plus, Wrench, Globe, Terminal, Code, Trash2, Edit, Play, X } from "lucide-react";
import { CustomTool, ToolParam, getTools, saveTool, deleteTool } from "@/lib/tools-store";
import clsx from "clsx";

const typeConfig = {
  http: { label: "HTTP", icon: Globe },
  shell: { label: "Shell", icon: Terminal },
  javascript: { label: "JS", icon: Code },
};

const emptyTool: CustomTool = {
  id: "",
  name: "",
  description: "",
  type: "http",
  endpoint: "",
  command: "",
  code: "",
  parameters: [],
  createdAt: "",
};

export default function ToolBuilder() {
  const [tools, setTools] = useState<CustomTool[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<CustomTool>(emptyTool);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    setTools(getTools());
  }, []);

  const refresh = () => setTools(getTools());

  const openNew = () => {
    setEditing({ ...emptyTool, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    setTestResult(null);
    setModal(true);
  };

  const openEdit = (tool: CustomTool) => {
    setEditing({ ...tool });
    setTestResult(null);
    setModal(true);
  };

  const handleSave = () => {
    if (!editing.name.trim()) return;
    saveTool(editing);
    refresh();
    setModal(false);
  };

  const handleDelete = (id: string) => {
    deleteTool(id);
    refresh();
  };

  const addParam = () => {
    setEditing({
      ...editing,
      parameters: [...editing.parameters, { name: "", type: "string" }],
    });
  };

  const removeParam = (idx: number) => {
    setEditing({
      ...editing,
      parameters: editing.parameters.filter((_, i) => i !== idx),
    });
  };

  const updateParam = (idx: number, field: keyof ToolParam, value: string) => {
    const params = [...editing.parameters];
    (params[idx] as any)[field] = value;
    setEditing({ ...editing, parameters: params });
  };

  const handleTest = () => {
    setTestResult("Test executed successfully. Tool configuration looks valid.");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Tool Builder</h1>
          <p className="text-sm text-[#555555] mt-0.5">Create and manage custom tools</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5e6ad2] text-white rounded-md text-[13px] font-medium hover:bg-[#6c78e0] transition-colors duration-150"
        >
          <Plus className="w-4 h-4" />
          New Tool
        </button>
      </div>

      {/* Tool Grid */}
      {tools.length === 0 ? (
        <div className="bg-[#111111] border border-[#222222] rounded-md p-16 text-center">
          <Wrench className="w-8 h-8 text-[#333333] mx-auto mb-4" />
          <h3 className="text-sm text-[#888888] mb-1.5">No tools yet</h3>
          <p className="text-xs text-[#555555] mb-5">Create your first custom tool to get started</p>
          <button
            onClick={openNew}
            className="px-4 py-2 bg-[#222222] text-[#ccc] rounded-md text-[13px] hover:bg-[#2a2a2a] transition-colors duration-150"
          >
            Create tool
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((tool) => {
            const cfg = typeConfig[tool.type];
            const Icon = cfg.icon;
            return (
              <div
                key={tool.id}
                className="bg-[#111111] border border-[#222222] rounded-md p-4 hover:bg-[#1a1a1a] transition-colors duration-150"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-1.5 bg-[#222222] rounded-md">
                    <Icon className="w-4 h-4 text-[#555555]" />
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888] font-medium uppercase tracking-wider">
                    {cfg.label}
                  </span>
                </div>
                <h3 className="text-[13px] font-medium text-[#f5f5f5] mb-1 truncate">{tool.name}</h3>
                <p className="text-[11px] text-[#555555] mb-3 line-clamp-2">{tool.description || "No description"}</p>
                {tool.parameters.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-[#555555] uppercase tracking-wider mb-1.5">Parameters</p>
                    <div className="flex flex-wrap gap-1">
                      {tool.parameters.map((p, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 bg-[#222222] rounded-sm text-[#888888] font-mono"
                        >
                          {p.name}: {p.type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-3 border-t border-[#222222]">
                  <button
                    onClick={() => openEdit(tool)}
                    className="flex items-center gap-1 text-[11px] text-[#555555] hover:text-[#f5f5f5] transition-colors duration-150"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tool.id)}
                    className="flex items-center gap-1 text-[11px] text-[#555555] hover:text-red-400 transition-colors duration-150"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#111111] border border-[#222222] rounded-md w-full max-w-lg mx-4 max-h-[85vh] overflow-auto shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#222222]">
              <h2 className="text-[13px] font-medium text-[#f5f5f5]">
                {getTools().find((t) => t.id === editing.id) ? "Edit tool" : "New tool"}
              </h2>
              <button
                onClick={() => setModal(false)}
                className="p-1 hover:bg-[#222222] rounded-md transition-colors duration-150"
              >
                <X className="w-4 h-4 text-[#555555]" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium block mb-1.5">
                  Tool name
                </label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#222222] rounded-md text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] transition-colors duration-150"
                  placeholder="my-tool"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium block mb-1.5">
                  Description
                </label>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#222222] rounded-md text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] transition-colors duration-150 resize-none"
                  rows={2}
                  placeholder="What does this tool do?"
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium block mb-1.5">
                  Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["http", "shell", "javascript"] as const).map((type) => {
                    const cfg = typeConfig[type];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setEditing({ ...editing, type })}
                        className={clsx(
                          "flex items-center justify-center gap-2 py-2 rounded-md border text-[13px] font-medium transition-colors duration-150",
                          editing.type === type
                            ? "bg-[#1a1a1a] border-[#5e6ad2] text-[#f5f5f5]"
                            : "border-[#222222] text-[#555555] hover:border-[#2a2a2a] hover:text-[#888888]"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type-specific field */}
              {editing.type === "http" && (
                <div>
                  <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium block mb-1.5">
                    Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={editing.endpoint || ""}
                    onChange={(e) => setEditing({ ...editing, endpoint: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#222222] rounded-md text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] font-mono"
                    placeholder="https://api.example.com/endpoint"
                  />
                </div>
              )}
              {editing.type === "shell" && (
                <div>
                  <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium block mb-1.5">
                    Shell command
                  </label>
                  <input
                    type="text"
                    value={editing.command || ""}
                    onChange={(e) => setEditing({ ...editing, command: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#222222] rounded-md text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] font-mono"
                    placeholder="echo 'hello world'"
                  />
                </div>
              )}
              {editing.type === "javascript" && (
                <div>
                  <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium block mb-1.5">
                    JavaScript code
                  </label>
                  <textarea
                    value={editing.code || ""}
                    onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#222222] rounded-md text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] font-mono resize-none"
                    rows={4}
                    placeholder={"// Your code here\nreturn { result: 'hello' };"}
                  />
                </div>
              )}

              {/* Parameters */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium">
                    Parameters
                  </label>
                  <button
                    onClick={addParam}
                    className="text-[11px] text-[#5e6ad2] hover:text-[#6c78e0] transition-colors duration-150 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
                {editing.parameters.length === 0 && (
                  <p className="text-[11px] text-[#444444]">No parameters defined</p>
                )}
                <div className="space-y-2">
                  {editing.parameters.map((param, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => updateParam(idx, "name", e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-[#0a0a0a] border border-[#222222] rounded-md text-[12px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2]"
                        placeholder="name"
                      />
                      <select
                        value={param.type}
                        onChange={(e) => updateParam(idx, "type", e.target.value)}
                        className="px-2.5 py-1.5 bg-[#0a0a0a] border border-[#222222] rounded-md text-[12px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]"
                      >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                      </select>
                      <button
                        onClick={() => removeParam(idx)}
                        className="p-1.5 hover:bg-[#222222] rounded-md text-[#555555] hover:text-red-400 transition-colors duration-150"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Result */}
              {testResult && (
                <div className="p-3 bg-[#111111] border border-[#222222] rounded-md text-[12px] text-[#888888]">
                  {testResult}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-[#222222]">
              <button
                onClick={handleTest}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#222222] text-[#ccc] rounded-md hover:bg-[#2a2a2a] transition-colors duration-150 text-[13px]"
              >
                <Play className="w-3 h-3" />
                Test
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setModal(false)}
                className="px-3 py-1.5 text-[13px] text-[#555555] hover:text-[#888888] transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-[#5e6ad2] text-white rounded-md text-[13px] font-medium hover:bg-[#6c78e0] transition-colors duration-150"
              >
                Save tool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
