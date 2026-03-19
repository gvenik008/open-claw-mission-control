"use client";

import { useState } from "react";
import { Search, FileText, ArrowLeft } from "lucide-react";
import clsx from "clsx";

type Category = "Test Plan" | "Bug Report" | "Test Result" | "Playbook";

interface Doc {
  id: string;
  title: string;
  category: Category;
  date: string;
  wordCount: number;
  lastModified: string;
  snippet: string;
  content: string;
}

const CATEGORY_COLORS: Record<Category, string> = {
  "Test Plan": "bg-[#5e6ad2]/10 text-[#5e6ad2]",
  "Bug Report": "bg-red-500/10 text-red-400",
  "Test Result": "bg-emerald-500/10 text-emerald-400",
  "Playbook": "bg-orange-500/10 text-orange-400",
};

const DOCS: Doc[] = [
  {
    id: "doc-1",
    title: "Severity Matrix",
    category: "Playbook",
    date: "2026-03-17",
    wordCount: 312,
    lastModified: "2026-03-17",
    snippet: "Defines P0–P3 severity levels for all QA findings. P0 is system down, P1 is critical regression...",
    content: `# Severity Matrix

Defines severity levels for all QA findings. Use this matrix to triage bugs consistently.

## P0 — Critical (System Down)
**Response time:** Immediate (within 1 hour)
**Definition:** System is completely unusable. Core functionality broken. Data loss possible.

Examples:
- API returning 500 on all requests
- Authentication completely broken
- Database corruption

## P1 — High (Critical Regression)
**Response time:** Same day
**Definition:** Major feature broken, no workaround available.

Examples:
- Core user flow broken
- Security vulnerability exposed
- Data integrity issues

## P2 — Medium (Significant Bug)
**Response time:** Within 48 hours
**Definition:** Feature partially broken. Workaround exists but painful.

Examples:
- UI renders incorrectly on some browsers
- Performance degradation >50%
- Non-critical data display issues

## P3 — Low (Minor Issue)
**Response time:** Next sprint
**Definition:** Minor cosmetic or UX issues. No functional impact.

Examples:
- Typos, alignment issues
- Minor UI polish
- Non-critical missing features`,
  },
  {
    id: "doc-2",
    title: "Bug Report Standard",
    category: "Playbook",
    date: "2026-03-17",
    wordCount: 248,
    lastModified: "2026-03-17",
    snippet: "Standard format for all bug reports filed by QA agents. Ensures reproducibility and clear severity...",
    content: `# Bug Report Standard

All bugs filed by QA agents must follow this format to ensure reproducibility and clear communication.

## Required Fields

### Title
Format: \`[COMPONENT] Short description of the bug\`
Example: \`[Auth] Login button unresponsive after failed attempt\`

### Severity
Use the Severity Matrix (P0–P3). Default to P2 when unsure; QA Lead will triage.

### Environment
- OS / Browser / Device
- Build version / commit hash
- Test environment (staging, prod, local)

### Steps to Reproduce
1. Navigate to X
2. Click Y
3. Enter Z
4. Observe the bug

### Expected Behavior
What should have happened.

### Actual Behavior
What actually happened. Include screenshots or logs.

### Workaround
If one exists, document it clearly.

## Optional Fields
- **Root cause hypothesis** — your best guess
- **Related issues** — links to similar bugs
- **Affected users** — estimated scope`,
  },
  {
    id: "doc-3",
    title: "Test Plan Template",
    category: "Test Plan",
    date: "2026-03-18",
    wordCount: 420,
    lastModified: "2026-03-18",
    snippet: "Standard test plan template for all QA agent test runs. Covers scope, objectives, test cases, pass criteria...",
    content: `# Test Plan Template

Use this template for all structured test runs.

## Metadata
- **Plan ID:** TP-XXXX
- **Author:** [Agent name]
- **Date:** YYYY-MM-DD
- **Version:** 1.0

## Scope
Describe what is being tested. List features in scope and explicitly list out-of-scope items.

## Objectives
- Verify [feature A] works correctly under normal conditions
- Ensure [feature B] handles edge cases gracefully
- Confirm no regressions in [component C]

## Test Environment
- Environment: staging / prod / local
- Data: fresh seed / existing dataset
- Prerequisites: [list setup steps]

## Test Cases

### TC-001: [Test case name]
**Priority:** P1
**Type:** Functional
**Steps:**
1. Setup: [preconditions]
2. Action: [what to do]
3. Verify: [expected result]

**Pass criteria:** [specific measurable outcome]

### TC-002: [Test case name]
...

## Pass/Fail Criteria

**Pass:** All P0 and P1 test cases pass. No more than 2 P2 failures with known workarounds.

**Fail:** Any P0 failure, or more than 2 P1 failures.

## Risks
- [Risk 1]: mitigation
- [Risk 2]: mitigation`,
  },
  {
    id: "doc-4",
    title: "Security Checklist",
    category: "Playbook",
    date: "2026-03-18",
    wordCount: 285,
    lastModified: "2026-03-18",
    snippet: "Security verification checklist for Adversarial QA. Covers auth, input validation, data exposure, rate limiting...",
    content: `# Security Checklist

Run by Adversarial QA on every release. Check all items before sign-off.

## Authentication & Authorization
- [ ] Login with invalid credentials returns generic error (no user enumeration)
- [ ] Session tokens expire correctly
- [ ] Password reset tokens are single-use
- [ ] JWT signatures validated server-side
- [ ] Admin routes require admin role

## Input Validation
- [ ] SQL injection: test with \`' OR 1=1--\`
- [ ] XSS: test with \`<script>alert(1)</script>\`
- [ ] Path traversal: test with \`../../../etc/passwd\`
- [ ] Oversized inputs handled gracefully (no 500s)
- [ ] Type coercion attacks (string vs number vs boolean)

## Data Exposure
- [ ] API responses don't include password hashes
- [ ] Internal IDs not predictable/sequential in public APIs
- [ ] Error messages don't leak stack traces in prod
- [ ] Sensitive fields masked in logs

## Rate Limiting
- [ ] Login endpoint rate-limited
- [ ] API endpoints have appropriate rate limits
- [ ] Brute force protection active

## Dependencies
- [ ] No known CVEs in direct dependencies
- [ ] \`npm audit\` clean (or known exceptions documented)

## Notes
Any failed checks must be filed as P0 or P1 bugs immediately.`,
  },
  {
    id: "doc-5",
    title: "Definition of Done",
    category: "Playbook",
    date: "2026-03-18",
    wordCount: 198,
    lastModified: "2026-03-18",
    snippet: "Criteria that must be met before any feature or fix is considered done by the QA organization...",
    content: `# Definition of Done

A feature or fix is **Done** when ALL of the following are true:

## Code Quality
- [ ] Code reviewed by at least one other agent
- [ ] No lint errors or type errors
- [ ] Tests written for new functionality
- [ ] Existing tests still pass

## QA Sign-off
- [ ] Functional QA: all happy paths verified
- [ ] Adversarial QA: edge cases and security checked
- [ ] No P0 or P1 bugs open against this feature
- [ ] P2 bugs documented with known workarounds

## Documentation
- [ ] README updated if public API changed
- [ ] Test plan updated or created
- [ ] Bug reports filed for any known issues

## Deployment
- [ ] Staging deployment successful
- [ ] Smoke tests pass on staging
- [ ] Rollback plan documented

## Sign-off
- QA Lead has approved the test report
- Gvenik has final sign-off on production release

---

*This is a living document. Update as the team's standards evolve.*`,
  },
  {
    id: "doc-6",
    title: "Smoke Test Results — March 18",
    category: "Test Result",
    date: "2026-03-18",
    wordCount: 156,
    lastModified: "2026-03-18",
    snippet: "Smoke test run results for Mission Control v0.1.0. 12 tests run, 11 passed, 1 known issue...",
    content: `# Smoke Test Results — March 18, 2026

**Plan:** TP-0001 (Smoke Test Suite)
**Tester:** Functional QA
**Environment:** Local (mission-control v0.1.0)
**Status:** PASS (with known issue)

## Summary
| Total | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| 12    | 11     | 0      | 1       |

## Results

| Test | Status | Notes |
|------|--------|-------|
| TC-001: Dashboard loads | ✅ Pass | |
| TC-002: Gateway health check | ✅ Pass | |
| TC-003: Sessions list renders | ✅ Pass | |
| TC-004: Tool Builder form | ✅ Pass | |
| TC-005: Settings persist | ✅ Pass | |
| TC-006: Sidebar navigation | ✅ Pass | |
| TC-007: Mobile viewport | ⏭ Skip | Not in scope |

## Known Issues
- None blocking

## Sign-off
QA Lead: **APPROVED**`,
  },
];

const CATEGORIES: (Category | "All")[] = ["All", "Test Plan", "Bug Report", "Test Result", "Playbook"];

function wordCount(content: string) {
  return content.trim().split(/\s+/).length;
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("# ")) {
      return <h1 key={i} className="text-[18px] font-bold text-[#f5f5f5] mb-3">{line.slice(2)}</h1>;
    }
    if (line.startsWith("## ")) {
      return <h2 key={i} className="text-[14px] font-semibold text-[#f5f5f5] mt-5 mb-2">{line.slice(3)}</h2>;
    }
    if (line.startsWith("### ")) {
      return <h3 key={i} className="text-[13px] font-medium text-[#f5f5f5] mt-3 mb-1">{line.slice(4)}</h3>;
    }
    if (line.startsWith("- [ ] ")) {
      return (
        <div key={i} className="flex items-start gap-2 py-0.5">
          <span className="w-3.5 h-3.5 border border-[#555555] rounded-sm shrink-0 mt-0.5 inline-block" />
          <span className="text-[13px] text-[#888888]">{line.slice(6)}</span>
        </div>
      );
    }
    if (line.startsWith("- ")) {
      return <p key={i} className="text-[13px] text-[#888888] leading-relaxed pl-3">· {line.slice(2)}</p>;
    }
    if (line.startsWith("| ")) {
      const cells = line.split("|").filter((c) => c.trim() !== "");
      const isSep = cells.every((c) => /^[-: ]+$/.test(c));
      if (isSep) return null;
      return (
        <div key={i} className="flex gap-3 py-1 border-b border-[#222222]">
          {cells.map((c, ci) => (
            <span key={ci} className="text-[12px] text-[#888888] flex-1">{c.trim()}</span>
          ))}
        </div>
      );
    }
    if (line.startsWith("---")) {
      return <hr key={i} className="border-[#222222] my-4" />;
    }
    if (line === "") return <div key={i} className="h-2" />;
    // Inline code
    const withCode = line.replace(/`([^`]+)`/g, '<code class="font-mono text-[#5e6ad2] bg-[#222222] px-1 rounded text-[11px]">$1</code>');
    // Bold
    const withBold = withCode.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#f5f5f5] font-medium">$1</strong>');
    return (
      <p
        key={i}
        className="text-[13px] text-[#888888] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: withBold }}
      />
    );
  });
}

export default function DocsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [selected, setSelected] = useState<Doc | null>(null);

  const filtered = DOCS.filter((d) => {
    if (category !== "All" && d.category !== category) return false;
    const q = search.toLowerCase();
    if (q && !d.title.toLowerCase().includes(q) && !d.snippet.toLowerCase().includes(q)) return false;
    return true;
  });

  if (selected) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-[#888888] hover:text-[#f5f5f5] text-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to docs
        </button>
        <div className="bg-[#111111] border border-[#222222] rounded-md p-6">
          <div className="flex items-start justify-between mb-4 pb-4 border-b border-[#222222]">
            <div>
              <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm font-medium", CATEGORY_COLORS[selected.category])}>
                {selected.category}
              </span>
              <h1 className="text-[18px] font-bold text-[#f5f5f5] mt-2">{selected.title}</h1>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-[11px] text-[#555555]">{wordCount(selected.content)} words</p>
              <p className="text-[11px] text-[#555555]">Modified {formatDate(selected.lastModified)}</p>
            </div>
          </div>
          <div className="space-y-0.5">{renderContent(selected.content)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Docs</h1>
          <p className="text-sm text-[#555555] mt-0.5">Test plans, bug reports, results</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555555]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search docs…"
            className="w-full bg-[#111111] border border-[#222222] rounded-md pl-8 pr-3 py-1.5 text-[12px] text-[#f5f5f5] placeholder:text-[#555555] focus:outline-none focus:border-[#5e6ad2]"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={clsx(
              "text-[11px] px-2.5 py-1 rounded-md transition-colors",
              category === cat
                ? "bg-[#5e6ad2] text-white"
                : "bg-[#222222] text-[#888888] hover:bg-[#2a2a2a] hover:text-[#f5f5f5]"
            )}
          >
            {cat}
          </button>
        ))}
        <span className="text-[11px] text-[#555555] self-center ml-1">{filtered.length} docs</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setSelected(doc)}
            className="bg-[#111111] border border-[#222222] rounded-md p-4 text-left hover:bg-[#1a1a1a] transition-colors duration-150 hover:border-[#2a2a2a]"
          >
            <div className="flex items-start justify-between mb-2">
              <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-sm font-medium", CATEGORY_COLORS[doc.category])}>
                {doc.category}
              </span>
              <FileText className="w-3.5 h-3.5 text-[#555555]" />
            </div>
            <h3 className="text-[13px] font-semibold text-[#f5f5f5] mb-1.5">{doc.title}</h3>
            <p className="text-[12px] text-[#555555] leading-snug line-clamp-2 mb-3">{doc.snippet}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#555555]">{wordCount(doc.content)} words</span>
              <span className="text-[10px] text-[#555555]">{formatDate(doc.lastModified)}</span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 bg-[#111111] border border-[#222222] rounded-md py-12 text-center">
            <p className="text-[13px] text-[#555555]">No docs found</p>
          </div>
        )}
      </div>
    </div>
  );
}
