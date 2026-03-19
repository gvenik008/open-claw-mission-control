"use client";

import { useState, useEffect } from "react";
import { Plus, X, Download, Upload, Rocket, Package, Code, Zap } from "lucide-react";
import clsx from "clsx";

interface ToolTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof Code;
  code: string;
  type: string;
}

interface CustomTool {
  id: string;
  name: string;
  type: string;
  code: string;
  createdAt: string;
  deployed: boolean;
}

const TEMPLATES: ToolTemplate[] = [
  { id: "t1", name: "Web Scraper", description: "Fetch and parse content from any URL", icon: Package, type: "javascript", code: `async function scrape(url) {\n  const res = await fetch(url);\n  const html = await res.text();\n  // Parse HTML and extract data\n  return { url, content: html.slice(0, 1000) };\n}` },
  { id: "t2", name: "API Caller", description: "Make authenticated REST API calls", icon: Zap, type: "javascript", code: `async function callAPI(endpoint, method = 'GET', body = null) {\n  const res = await fetch(endpoint, {\n    method,\n    headers: { 'Content-Type': 'application/json' },\n    body: body ? JSON.stringify(body) : null\n  });\n  return await res.json();\n}` },
  { id: "t3", name: "File Reader", description: "Read and process files from the workspace", icon: Code, type: "javascript", code: `const fs = require('fs');\nconst path = require('path');\n\nfunction readFile(filePath) {\n  const content = fs.readFileSync(path.resolve(filePath), 'utf-8');\n  return { path: filePath, lines: content.split('\\n').length, content };\n}` },
  { id: "t4", name: "Shell Runner", description: "Execute shell commands safely", icon: Rocket, type: "bash", code: `#!/bin/bash\n# Shell Runner Tool\n# Usage: ./runner.sh <command>\n\nset -euo pipefail\n\necho "Executing: $@"\neval "$@"\necho "\\nExit code: $?"` },
];

export default function FactoryPage() {
  const [tools, setTools] = useState<CustomTool[]>([]);
  const [activeTab, setActiveTab] = useState<"templates" | "my-tools" | "build">("templates");
  const [editorCode, setEditorCode] = useState("");
  const [editorName, setEditorName] = useState("");
  const [editorType, setEditorType] = useState("javascript");
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mc-factory-tools");
      if (stored) setTools(JSON.parse(stored));
    } catch { /* empty */ }
  }, []);

  function save(updated: CustomTool[]) {
    setTools(updated);
    localStorage.setItem("mc-factory-tools", JSON.stringify(updated));
  }

  function loadTemplate(template: ToolTemplate) {
    setEditorName(template.name);
    setEditorCode(template.code);
    setEditorType(template.type);
    setActiveTab("build");
    setDeployed(false);
  }

  function handleDeploy() {
    if (!editorName.trim() || !editorCode.trim()) return;
    setDeploying(true);
    setTimeout(() => {
      const tool: CustomTool = {
        id: "tool-" + Date.now(),
        name: editorName,
        type: editorType,
        code: editorCode,
        createdAt: new Date().toISOString().split("T")[0],
        deployed: true,
      };
      save([tool, ...tools]);
      setDeploying(false);
      setDeployed(true);
      setTimeout(() => setDeployed(false), 3000);
    }, 1500);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(tools, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "openclaw-tools.json"; a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          if (Array.isArray(imported)) save([...imported, ...tools]);
        } catch { /* invalid json */ }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Tool Factory</h1>
          <p className="text-sm text-[#555555] mt-0.5">Build, deploy & manage custom tools</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleImport} className="flex items-center gap-1.5 bg-[#222222] hover:bg-[#2a2a2a] text-[#ccc] text-xs rounded-md px-3 py-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 bg-[#222222] hover:bg-[#2a2a2a] text-[#ccc] text-xs rounded-md px-3 py-1.5 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#222222] pb-2">
        {(["templates", "my-tools", "build"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} className={clsx("text-xs px-3 py-1.5 rounded-md transition-colors capitalize", activeTab === t ? "bg-[#1a1a1a] text-[#f5f5f5]" : "text-[#555555] hover:text-[#888888]")}>
            {t.replace("-", " ")}
          </button>
        ))}
      </div>

      {/* Templates */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <div key={tmpl.id} onClick={() => loadTemplate(tmpl)} className="bg-[#111111] border border-[#222222] rounded-md p-4 hover:bg-[#1a1a1a] transition-colors cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-[#5e6ad2]/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#5e6ad2]" />
                  </div>
                  <div>
                    <h3 className="text-[13px] text-[#f5f5f5] font-medium">{tmpl.name}</h3>
                    <p className="text-[10px] text-[#555555]">{tmpl.type}</p>
                  </div>
                </div>
                <p className="text-[11px] text-[#555555] mb-3">{tmpl.description}</p>
                <span className="text-[10px] text-[#5e6ad2] group-hover:text-[#6c78e0] transition-colors">Use template →</span>
              </div>
            );
          })}
        </div>
      )}

      {/* My Tools */}
      {activeTab === "my-tools" && (
        <div className="space-y-2">
          {tools.length === 0 && <div className="text-center py-12 text-[#555555] text-sm">No tools created yet. Start from a template!</div>}
          {tools.map((tool) => (
            <div key={tool.id} className="bg-[#111111] border border-[#222222] rounded-md p-4 flex items-center justify-between">
              <div>
                <h3 className="text-[13px] text-[#f5f5f5] font-medium">{tool.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#222222] text-[#888888]">{tool.type}</span>
                  <span className="text-[10px] text-[#555555]">{tool.createdAt}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {tool.deployed && <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-400">Deployed</span>}
                <button onClick={() => { setEditorName(tool.name); setEditorCode(tool.code); setEditorType(tool.type); setActiveTab("build"); }} className="text-[11px] text-[#555555] hover:text-[#888888]">Edit</button>
                <button onClick={() => save(tools.filter((t) => t.id !== tool.id))} className="text-[11px] text-red-400 hover:text-red-300">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Build Area */}
      {activeTab === "build" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Tool Name</label>
              <input value={editorName} onChange={(e) => setEditorName(e.target.value)} placeholder="My Tool" className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2]" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Type</label>
              <select value={editorType} onChange={(e) => setEditorType(e.target.value)} className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]">
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="bash">Bash</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Code</label>
            <textarea value={editorCode} onChange={(e) => setEditorCode(e.target.value)} rows={16} placeholder="// Write your tool code here..." className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-4 py-3 text-[13px] text-cyan-400 font-mono placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2] resize-none leading-relaxed" spellCheck={false} />
          </div>
          <div className="flex justify-end">
            <button onClick={handleDeploy} disabled={deploying} className={clsx("flex items-center gap-1.5 text-white text-xs rounded-md px-4 py-2 transition-all", deploying ? "bg-orange-600 animate-pulse" : deployed ? "bg-emerald-600" : "bg-[#5e6ad2] hover:bg-[#6c78e0]")}>
              {deploying ? <><Rocket className="w-3.5 h-3.5 animate-bounce" /> Deploying...</> : deployed ? <><Rocket className="w-3.5 h-3.5" /> Deployed ✓</> : <><Rocket className="w-3.5 h-3.5" /> Deploy Tool</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
