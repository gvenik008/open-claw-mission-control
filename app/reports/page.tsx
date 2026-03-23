"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, FileText, Download, ChevronLeft, ExternalLink, Copy, Check } from "lucide-react";
import clsx from "clsx";

interface Report {
  filename: string;
  title: string;
  content: string;
  date: string;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getReportType(filename: string): { label: string; color: string } {
  if (filename.includes("security")) return { label: "Security", color: "bg-red-500/10 text-red-400" };
  if (filename.includes("product")) return { label: "Product", color: "bg-purple-500/10 text-purple-400" };
  if (filename.includes("full-report")) return { label: "Full QA", color: "bg-blue-500/10 text-blue-400" };
  if (filename.includes("qa")) return { label: "QA", color: "bg-emerald-500/10 text-emerald-400" };
  return { label: "Report", color: "bg-[#222222] text-[#888888]" };
}

// Simple markdown renderer — handles headers, bold, tables, lists, code blocks
function renderMarkdown(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={key++} className="bg-[#0a0a0a] border border-[#222222] rounded-md px-4 py-3 my-3 overflow-x-auto text-[12px] text-[#aaa] font-mono">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Table
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        // Skip separator rows
        if (!cells.every((c) => /^[-:]+$/.test(c))) {
          tableRows.push(cells);
        }
        i++;
      }
      if (tableRows.length > 0) {
        const header = tableRows[0];
        const body = tableRows.slice(1);
        elements.push(
          <div key={key++} className="my-3 overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  {header.map((h, ci) => (
                    <th key={ci} className="text-left px-3 py-2 text-[#888888] border-b border-[#222222] font-medium whitespace-nowrap">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className="hover:bg-[#1a1a1a] transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-[#ccc] border-b border-[#1a1a1a] whitespace-nowrap">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      elements.push(<h1 key={key++} className="text-xl font-semibold text-[#f5f5f5] mt-6 mb-3">{renderInline(line.slice(2))}</h1>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-lg font-semibold text-[#f5f5f5] mt-5 mb-2 border-b border-[#222222] pb-1">{renderInline(line.slice(3))}</h2>);
      i++; continue;
    }
    if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} className="text-[14px] font-semibold text-[#ddd] mt-4 mb-1.5">{renderInline(line.slice(4))}</h3>);
      i++; continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={key++} className="border-[#222222] my-4" />);
      i++; continue;
    }

    // List items
    if (line.match(/^[-*] /)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        listItems.push(lines[i].replace(/^[-*] /, ""));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-2 space-y-1">
          {listItems.map((item, li) => (
            <li key={li} className="flex gap-2 text-[13px] text-[#ccc]">
              <span className="text-[#555555] mt-0.5 shrink-0">•</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        listItems.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={key++} className="my-2 space-y-1 list-decimal list-inside">
          {listItems.map((item, li) => (
            <li key={li} className="text-[13px] text-[#ccc]">{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") { i++; continue; }

    // Regular paragraph
    elements.push(<p key={key++} className="text-[13px] text-[#ccc] leading-relaxed my-1.5">{renderInline(line)}</p>);
    i++;
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  // Handle bold, inline code, links
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let partKey = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={partKey++}>{renderInline(codeMatch[1])}</span>);
      parts.push(<code key={partKey++} className="bg-[#1a1a1a] px-1 py-0.5 rounded text-[12px] text-[#e8a4ef] font-mono">{codeMatch[2]}</code>);
      remaining = codeMatch[3];
      continue;
    }

    // Bold
    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<span key={partKey++}>{boldMatch[1]}</span>);
      parts.push(<strong key={partKey++} className="text-[#f5f5f5] font-semibold">{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
      continue;
    }

    // No more matches
    parts.push(<span key={partKey++}>{remaining}</span>);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [copied, setCopied] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  function handleCopy() {
    if (!selectedReport) return;
    navigator.clipboard.writeText(selectedReport.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!selectedReport) return;
    const blob = new Blob([selectedReport.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedReport.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Detail view
  if (selectedReport) {
    const type = getReportType(selectedReport.filename);
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setSelectedReport(null)}
            className="flex items-center gap-1.5 text-[#555555] hover:text-[#888888] text-xs transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Reports
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[#555555] hover:text-[#888888] text-xs px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-[#555555] hover:text-[#888888] text-xs px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        </div>

        {/* Report meta */}
        <div className="flex items-center gap-2 mb-4">
          <span className={clsx("text-[10px] px-2 py-0.5 rounded-sm font-medium", type.color)}>
            {type.label}
          </span>
          {selectedReport.date && (
            <span className="text-[11px] text-[#555555]">{formatDate(selectedReport.date)}</span>
          )}
          <span className="text-[11px] text-[#444444]">{selectedReport.filename}</span>
        </div>

        {/* Report content */}
        <div className="bg-[#111111] border border-[#222222] rounded-md px-6 py-5">
          {renderMarkdown(selectedReport.content)}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Reports</h1>
          <p className="text-sm text-[#555555] mt-0.5">
            {loading ? "Loading…" : `${reports.length} report${reports.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); loadReports(); }}
          className="flex items-center gap-1.5 text-[#555555] hover:text-[#888888] text-xs px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors"
        >
          <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
        </button>
      </div>

      {/* Reports grid */}
      {reports.length === 0 && !loading && (
        <div className="bg-[#111111] border border-[#222222] rounded-md px-6 py-12 text-center">
          <FileText className="w-8 h-8 text-[#333333] mx-auto mb-3" />
          <p className="text-[13px] text-[#555555]">No reports yet</p>
          <p className="text-[11px] text-[#444444] mt-1">Reports will appear here after QA tasks complete</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((report) => {
          const type = getReportType(report.filename);
          // Extract first few lines for preview
          const previewLines = report.content
            .split("\n")
            .filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("---") && !l.startsWith("**"))
            .slice(0, 3)
            .join(" ")
            .slice(0, 150);

          return (
            <button
              key={report.filename}
              onClick={() => setSelectedReport(report)}
              className="bg-[#111111] border border-[#222222] rounded-md p-4 text-left hover:bg-[#1a1a1a] hover:border-[#333333] transition-all duration-150 group"
            >
              <div className="flex items-start justify-between mb-2">
                <span className={clsx("text-[10px] px-2 py-0.5 rounded-sm font-medium", type.color)}>
                  {type.label}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-[#333333] group-hover:text-[#555555] transition-colors" />
              </div>
              <h3 className="text-[13px] font-medium text-[#f5f5f5] leading-snug mb-1.5 line-clamp-2">
                {report.title}
              </h3>
              {previewLines && (
                <p className="text-[11px] text-[#555555] leading-snug line-clamp-2 mb-2">
                  {previewLines}
                </p>
              )}
              <div className="flex items-center gap-2">
                {report.date && (
                  <span className="text-[10px] text-[#444444]">{formatDate(report.date)}</span>
                )}
                <span className="text-[10px] text-[#333333]">
                  {Math.round(report.content.length / 1024)}KB
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
