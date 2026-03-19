"use client";

import { useState, useEffect } from "react";
import { Plus, X, ArrowRight, Play, Clock, Zap, ChevronDown, ChevronRight } from "lucide-react";
import clsx from "clsx";

type TriggerType = "Manual" | "Scheduled" | "Event";
type PipelineStatus = "Active" | "Paused" | "Draft";

interface PipelineStep {
  id: string;
  name: string;
  type: string;
}

interface Pipeline {
  id: string;
  name: string;
  trigger: TriggerType;
  status: PipelineStatus;
  lastRun: string;
  steps: PipelineStep[];
}

const STATUS_COLORS: Record<PipelineStatus, string> = {
  Active: "bg-emerald-500/10 text-emerald-400",
  Paused: "bg-yellow-500/10 text-yellow-400",
  Draft: "bg-[#222222] text-[#888888]",
};

const TRIGGER_ICONS: Record<TriggerType, typeof Play> = {
  Manual: Play,
  Scheduled: Clock,
  Event: Zap,
};

const DEFAULT_PIPELINES: Pipeline[] = [
  {
    id: "pl1", name: "Morning Briefing", trigger: "Scheduled", status: "Active", lastRun: "2026-03-18T08:00:00",
    steps: [
      { id: "s1", name: "Check Email", type: "action" },
      { id: "s2", name: "Scan Calendar", type: "action" },
      { id: "s3", name: "Check Weather", type: "action" },
      { id: "s4", name: "Compose Summary", type: "transform" },
      { id: "s5", name: "Send to Telegram", type: "output" },
    ],
  },
  {
    id: "pl2", name: "Content Publisher", trigger: "Manual", status: "Active", lastRun: "2026-03-17T15:30:00",
    steps: [
      { id: "s1", name: "Select Content", type: "input" },
      { id: "s2", name: "Format for Platform", type: "transform" },
      { id: "s3", name: "Review & Approve", type: "action" },
      { id: "s4", name: "Publish", type: "output" },
    ],
  },
  {
    id: "pl3", name: "Alert Monitor", trigger: "Event", status: "Active", lastRun: "2026-03-18T20:45:00",
    steps: [
      { id: "s1", name: "Watch Signals", type: "input" },
      { id: "s2", name: "Evaluate Priority", type: "transform" },
      { id: "s3", name: "Notify if Critical", type: "output" },
    ],
  },
];

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", trigger: "Manual" as TriggerType });
  const [formSteps, setFormSteps] = useState<string[]>([""]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mc-pipelines");
      if (stored) setPipelines(JSON.parse(stored));
      else { setPipelines(DEFAULT_PIPELINES); localStorage.setItem("mc-pipelines", JSON.stringify(DEFAULT_PIPELINES)); }
    } catch { setPipelines(DEFAULT_PIPELINES); }
  }, []);

  function save(updated: Pipeline[]) {
    setPipelines(updated);
    localStorage.setItem("mc-pipelines", JSON.stringify(updated));
  }

  function handleCreate() {
    if (!form.name.trim()) return;
    const pipeline: Pipeline = {
      id: "pl-" + Date.now(),
      name: form.name,
      trigger: form.trigger,
      status: "Draft",
      lastRun: "Never",
      steps: formSteps.filter((s) => s.trim()).map((s, i) => ({ id: `s${i}`, name: s, type: "action" })),
    };
    save([...pipelines, pipeline]);
    setForm({ name: "", trigger: "Manual" });
    setFormSteps([""]);
    setShowModal(false);
  }

  function formatTime(ts: string) {
    if (ts === "Never") return "Never";
    const d = new Date(ts);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const stepColor = (type: string) => {
    if (type === "input") return "border-cyan-500/40 bg-cyan-500/5";
    if (type === "transform") return "border-purple-500/40 bg-purple-500/5";
    if (type === "output") return "border-green-500/40 bg-green-500/5";
    return "border-[#333333] bg-[#0a0a0a]";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Pipeline</h1>
          <p className="text-sm text-[#555555] mt-0.5">Automation workflows & pipeline builder</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Pipeline
        </button>
      </div>

      {/* Pipeline List */}
      <div className="space-y-2">
        {pipelines.map((pipeline) => {
          const TriggerIcon = TRIGGER_ICONS[pipeline.trigger];
          const isExpanded = expanded === pipeline.id;
          return (
            <div key={pipeline.id} className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
              <div onClick={() => setExpanded(isExpanded ? null : pipeline.id)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#1a1a1a] transition-colors">
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-[#555555]" /> : <ChevronRight className="w-4 h-4 text-[#555555]" />}
                  <div>
                    <h3 className="text-[13px] text-[#f5f5f5] font-medium">{pipeline.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <TriggerIcon className="w-3 h-3 text-[#555555]" />
                      <span className="text-[10px] text-[#555555]">{pipeline.trigger}</span>
                      <span className="text-[10px] text-[#555555]">• {pipeline.steps.length} steps</span>
                      <span className="text-[10px] text-[#555555]">• Last: {formatTime(pipeline.lastRun)}</span>
                    </div>
                  </div>
                </div>
                <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm font-medium", STATUS_COLORS[pipeline.status])}>{pipeline.status}</span>
              </div>

              {/* Expanded Step Flow */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[#222222]">
                  <div className="flex items-center gap-2 py-4 overflow-x-auto">
                    {pipeline.steps.map((step, i) => (
                      <div key={step.id} className="flex items-center gap-2 shrink-0">
                        <div className={clsx("border rounded-md px-4 py-3 min-w-[140px]", stepColor(step.type))}>
                          <p className="text-[10px] text-[#555555] uppercase mb-0.5">Step {i + 1}</p>
                          <p className="text-[13px] text-[#f5f5f5]">{step.name}</p>
                          <p className="text-[10px] text-[#555555] mt-0.5">{step.type}</p>
                        </div>
                        {i < pipeline.steps.length - 1 && <ArrowRight className="w-4 h-4 text-[#555555] shrink-0" />}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs rounded-md px-3 py-1.5 transition-colors">
                      <Play className="w-3 h-3" /> Run Now
                    </button>
                    <button onClick={() => save(pipelines.filter((p) => p.id !== pipeline.id))} className="text-[11px] text-red-400 hover:text-red-300 px-2">Delete</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Pipeline Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#111111] border border-[#222222] rounded-md w-96 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#f5f5f5]">New Pipeline</h2>
              <button onClick={() => setShowModal(false)} className="text-[#555555] hover:text-[#888888]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Name</label>
                <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pipeline name" className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2]" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Trigger</label>
                <select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value as TriggerType })} className="w-full bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] focus:outline-none focus:border-[#5e6ad2]">
                  {(["Manual", "Scheduled", "Event"] as TriggerType[]).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555555] font-medium block mb-1">Steps</label>
                {formSteps.map((step, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={step} onChange={(e) => { const s = [...formSteps]; s[i] = e.target.value; setFormSteps(s); }} placeholder={`Step ${i + 1}`} className="flex-1 bg-[#0a0a0a] border border-[#222222] rounded-md px-3 py-2 text-[13px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2]" />
                    {formSteps.length > 1 && <button onClick={() => setFormSteps(formSteps.filter((_, j) => j !== i))} className="text-[#555555] hover:text-red-400"><X className="w-4 h-4" /></button>}
                  </div>
                ))}
                <button onClick={() => setFormSteps([...formSteps, ""])} className="text-[11px] text-[#5e6ad2] hover:text-[#6c78e0]">+ Add Step</button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="bg-[#222222] hover:bg-[#2a2a2a] text-[#ccc] text-xs rounded-md px-3 py-1.5 transition-colors">Cancel</button>
              <button onClick={handleCreate} className="bg-[#5e6ad2] hover:bg-[#6c78e0] text-white text-xs rounded-md px-3 py-1.5 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
