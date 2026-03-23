# Functional QA Report — Remaining Mission Control Pages
**Date:** 2026-03-23  
**Tester:** Scout (Functional QA)  
**Target:** http://localhost:3001  
**Status:** ✅ Complete

---

## Bug Summary

| ID | Severity | Page | Description |
|----|----------|------|-------------|
| BUG-MC2-001 | 🔴 Critical | Docs (/docs) | Clicking any interactive element navigates away to Factory page |
| BUG-MC2-002 | 🔴 Critical | Reports (/reports) | "Back to Reports" button navigates to Factory instead of reports list |
| BUG-MC2-003 | 🟡 Medium | Calendar (/calendar) | Stat cards show 0 for Scheduled and Upcoming despite tasks existing (no due_dates set) |
| BUG-MC2-004 | 🟡 Medium | Radar (/radar) | Agent Performance table lists test/junk agents (xss-test, sqli-test, SQLi payloads in agent_id) |
| BUG-MC2-005 | 🟢 Low | Docs (/docs) | Only 6 agents listed — "main" (Gvenik) shows division as "none" instead of a proper division |
| BUG-MC2-006 | 🟢 Low | Calendar (/calendar) | Week View shows empty grid even though tasks exist (tasks have no due_date) |
| BUG-MC2-007 | 🟢 Low | Settings (/settings) | Sessions (DB) shows "0" — may be correct if sessions aren't stored in DB, but misleading |

---

## Page 1: Calendar (/calendar)

### Structure ✅
- **H1:** "Calendar" with subtitle "Scheduled tasks and cron jobs"
- **Refresh button:** Present ✅
- **3 stat cards:** Scheduled (0), Upcoming (7d) (0), Cron Jobs (0) ✅

### Tab Navigation ✅
- **3 tabs present:** Upcoming, Week View, Cron Jobs ✅
- **Tab switching works:** All 3 tabs load their respective content ✅
- **Active tab state:** Highlighted correctly ✅

### Upcoming Tab ✅
- Shows "No upcoming scheduled tasks in the next 7 days" (empty state) ✅
- **Recent Task Activity section:** Shows 20+ tasks with status badges (done, in_progress, pending) ✅
- Tasks display: title, status, and relative time ("4h ago", "3d ago") ✅

### Week View Tab ✅
- 7-day grid renders: Mon 23, Tue 24, Wed 25, Thu 26, Fri 27, Sat 28, Sun 29 ✅
- Grid is empty (no tasks have due_dates) — see BUG-MC2-006

### Cron Jobs Tab ✅
- Shows "No cron jobs found" with explanation ✅
- Shows note about config file location (`~/.openclaw/config.yaml`) ✅
- Helpful guidance text present ✅

### BUG-MC2-003: Stat Cards Always Show Zero
- **Severity:** Medium
- **Page:** Calendar (/calendar)
- **Description:** Stat cards show Scheduled=0, Upcoming (7d)=0 despite 29 tasks in DB. This is technically correct (no tasks have `due_date` set), but misleading because users expect to see their tasks here.
- **Steps:** Navigate to /calendar → observe stat cards
- **Expected:** Either show task counts based on created_at/updated_at, or clearly indicate "No tasks with scheduled dates"
- **Actual:** Shows "0" for all cards while Recent Task Activity lists 20+ tasks below

### BUG-MC2-006: Week View Empty Despite Tasks Existing
- **Severity:** Low
- **Page:** Calendar (/calendar)
- **Description:** Week View grid shows empty cells for all 7 days. No tasks appear because none have `due_date` set.
- **Steps:** Navigate to /calendar → click "Week View"
- **Expected:** Either place tasks by created_at or show a hint that tasks need due_date to appear on calendar
- **Actual:** Empty 7-day grid with no explanation

---

## Page 2: Radar / Monitoring (/radar)

### Structure ✅
- **H1:** "Radar" with subtitle "System health and agent performance metrics"
- **Refresh button:** Present ✅

### Stat Cards ✅ — NUMBERS VERIFIED
| Card | Displayed | API Reality | Match? |
|------|-----------|-------------|--------|
| Active Agents | 6 | 6 (deploy-agent API) | ✅ |
| Tasks Completed | 12 of 29 total | 12/29 (tasks API) | ✅ |
| Completion Rate | 41% | 12/29 = 41.4% | ✅ |
| In Progress | 5 (12 pending) | 5 in_progress, 12 pending | ✅ |

### Daily Activity Bar Chart ✅
- Shows 2 bars: Thu 3/19 (50 activities), Mon 3/23 (43 activities)
- Proportions appear correct (50 > 43) ✅
- **Note:** Only 2 days with activity, not 7. The "Last 7 Days" label is accurate since it shows what's available.

### Activity Types Breakdown ✅
- Lists 9 activity types with counts:
  - Task Created: 29, Agent Trained: 23, Agent Deployed: 18, Agent Retired: 10, Agent Updated: 6, Task Status Changed: 2, Skills Auto Assigned: 2, Connection Created: 2, System Start: 1
- Matches the API data ✅

### Agent Performance Table ✅ (with issue)
- Lists all agents with: name, agent_id, activity count, tasks done ratio, last active, status
- Data accurate for real agents ✅

### BUG-MC2-004: Junk/Test Agents in Performance Table
- **Severity:** Medium
- **Page:** Radar (/radar)
- **Description:** Agent Performance table lists test artifacts and security-test agents alongside real agents: `test-bot`, `qa-test-agent`, `xss-test`, `test-dup`, `'; DROP TABLE agents;--`, `does-not-exist-abc`, `longname-test`, `scriptalert1script`, `sqli-test`, etc.
- **Steps:** Navigate to /radar → scroll to Agent Performance table
- **Expected:** Only show currently active/deployed agents (6 real agents)
- **Actual:** Shows 21 entries including SQL injection payloads as agent names (e.g., `'; DROP TABLE agents;--`)
- **Additional concern:** The SQL injection payload is rendered as text in the table (XSS-safe via React), but it's confusing and exposes test data to users

### Recent Issues & Errors ✅
- Shows "No recent errors or timeouts" (correct — no error-type activities) ✅

---

## Page 3: Settings (/settings)

### Structure ✅
- **H1:** "Settings" with subtitle "Mission Control configuration and system info"
- **Refresh button:** Present ✅

### 5 Config Cards ✅

**1. General Card ✅**
| Field | Value | Correct? |
|-------|-------|----------|
| Instance Name | Mission Control | ✅ |
| Version | 1.0.0 | ✅ |
| Workspace Path | ~/.openclaw/workspace | ✅ |
| Environment | production | ✅ |
- Read-only notice: "Settings are read-only. To modify configuration, edit the gateway config at `~/.openclaw/config.yaml`." ✅

**2. Agent Defaults Card ✅**
| Field | Value |
|-------|-------|
| Default Model | anthropic/claude-sonnet-4-6 |
| Default Timeout | 600s (10 min) |
| Browser Timeout | 900s (15 min) |
| Max Task Timeout | 1200s (20 min) |
| Auto-training | ✅ Enabled |
| Skill Auto-assignment | ✅ Enabled |

**3. Notifications Card ✅**
| Field | Value |
|-------|-------|
| Telegram Bot | ✅ Connected |
| Alert on task complete | ✅ On |
| Alert on error | ✅ On |
| Heartbeat interval | ~30 min |

**4. System Card ✅ — NUMBERS VERIFIED**
| Stat | Displayed | Reality | Match? |
|------|-----------|---------|--------|
| Active Agents | 6 | 6 (API) | ✅ |
| Total Tasks | 29 | 29 (API) | ✅ |
| Total Activities | 93 | 93 (API w/ limit=200) | ✅ |
| Sessions (DB) | 0 | 0 (no sessions stored) | ⚠️ See BUG-MC2-007 |
- Database info: "SQLite (better-sqlite3) · WAL mode" ✅

**5. Storage Card ✅**
| Field | Value |
|-------|-------|
| Database | data/mission-control.db |
| Reports | reports/ |
| Skills | ~/.openclaw/workspace/skills/ |
| Agent Workspaces | ~/.openclaw/workspace-{agent_id}/ |
- Helpful note about local storage ✅

### BUG-MC2-007: Sessions (DB) Shows 0
- **Severity:** Low
- **Page:** Settings (/settings)
- **Description:** Sessions (DB) count shows "0" while Sessions page shows active sessions. This may be correct if sessions aren't persisted in the Mission Control DB (they're in OpenClaw's native storage), but it's misleading next to accurate agent/task counts.
- **Steps:** Navigate to /settings → check System card
- **Expected:** Either show the real session count or label it "Sessions (local DB)" with a note
- **Actual:** Shows "0" without context

---

## Page 4: Docs (/docs)

### Structure ✅
- **H1:** "Docs" with subtitle "Agent documentation, API reference, and guides"
- **Refresh button:** Present ✅
- **Search box:** Present and functional ✅
- **3 tabs:** Agent Docs, API Reference, Guides ✅

### Agent Docs Tab ✅ (with critical navigation bug)
- **6 agents listed:** Gvenik, Atlas, Scout, Sentinel, Rover, Prism ✅
- Each shows: initials, name, division, role description ✅
- Expand arrow (chevron) present on each ✅

### BUG-MC2-001: Clicking Any Element Navigates Away
- **Severity:** 🔴 Critical
- **Page:** Docs (/docs)
- **Description:** Clicking any interactive element on the Docs page (agent cards, tab buttons, Guides tab) causes navigation to the Factory page (/factory). This makes the Docs page almost completely non-functional — users cannot expand agent docs, switch tabs via click, or interact with guides.
- **Steps:**
  1. Navigate to http://localhost:3001/docs
  2. Click any agent card (e.g., Gvenik)
  3. Observe: page navigates to /factory
- **Expected:** Agent card expands to show SOUL.md content; tabs switch between Agent Docs/API Reference/Guides
- **Actual:** Navigation to /factory page occurs on every click interaction
- **Root Cause Hypothesis:** Event bubbling issue — a parent element may have a click handler or link that catches all clicks and navigates to /factory. Possibly a Next.js Link component wrapping too much content, or a shared layout component with incorrect routing.
- **Impact:** Cannot test: agent SOUL.md expansion, Guides tab content, tab switching via mouse click
- **Workaround found:** JavaScript `evaluate` can programmatically click tabs (API Reference tab works when clicked via JS), and search input works via keyboard focus. So the page renders correctly server-side.

### API Reference Tab ✅ (tested via JS click)
- **14 endpoints listed** with method + path + description:
  1. GET /api/deploy-agent — List all deployed agents
  2. POST /api/deploy-agent — Deploy a new agent
  3. GET /api/tasks — List all tasks with agent info
  4. POST /api/tasks — Create a new task
  5. PATCH /api/tasks — Update task status or result
  6. DELETE /api/tasks — Delete a task
  7. POST /api/train — Train an agent with a lesson
  8. POST /api/skill-match — Find the best agent for a task
  9. GET /api/reports — List all saved reports
  10. POST /api/reports — Save a new report
  11. GET /api/activities — List agent activities
  12. POST /api/activities — Log an agent activity
  13. GET /api/skills — List all available skills
  14. GET /api/tools — List all available tools
- ✅ 14 endpoints confirmed
- **Method badges present** but color verification blocked by BUG-MC2-001

### Guides Tab ✅ (tested via JS)
- **3 sections found:** Agent Hierarchy, Task Flow, Training System ✅

### Search ✅
- Typing "security" filters to show only Sentinel agent ✅
- Search is real-time (filters as you type) ✅

### BUG-MC2-005: Gvenik Division Shows "none"
- **Severity:** Low
- **Page:** Docs (/docs)
- **Description:** Gvenik's division badge shows "none" instead of a meaningful value like "Core" or "Orchestration"
- **Steps:** Navigate to /docs → observe Gvenik's agent card
- **Expected:** Division shows a descriptive label or is hidden if not applicable
- **Actual:** Shows "none" as literal text in the division badge

---

## Page 5: Reports (/reports) — Regression

### Report List ✅
- **8 reports displayed** (subtitle confirms "8 reports") ✅
- All reports from API present ✅
- Each card shows: type badge, title, content preview, date, file size ✅

### Type Badges ✅ — COLORS VERIFIED
| Type | Badge Color | Expected | Match? |
|------|------------|----------|--------|
| QA | Emerald/Green (rgb 52,211,153) | Green | ✅ |
| Security | Red (rgb 248,113,113) | Red | ✅ |
| Product | Purple (rgb 192,132,252) | Purple | ✅ |
| Full QA | Blue (rgb 96,165,250) | Blue | ✅ |

### Report Detail View ✅
- Click report → full markdown renders ✅
- **Headers** (h1, h2, h3) render correctly ✅
- **Tables** render with proper columns and rows ✅
- **Bold text** renders correctly ✅
- **Lists** (ordered and unordered) render correctly ✅
- **Code blocks** render with monospace formatting ✅
- **Horizontal rules** (separators) render ✅
- **Copy button:** Present ✅ (clipboard testing limited in automated context)
- **Download button:** Present ✅ (file download testing limited in automated context)

### BUG-MC2-002: Back Button Navigates to Wrong Page
- **Severity:** 🔴 Critical
- **Page:** Reports (/reports) — detail view
- **Description:** Clicking "Back to Reports" button in report detail view navigates to /factory instead of /reports list.
- **Steps:**
  1. Navigate to /reports
  2. Click any report (e.g., "QA Round 2 Report")
  3. Report renders correctly in detail view
  4. Click "Back to Reports" button
  5. Page navigates to /factory
- **Expected:** Return to /reports list
- **Actual:** Navigation to /factory page
- **Root Cause Hypothesis:** Same underlying routing bug as BUG-MC2-001 — likely a shared navigation handler or Next.js router issue affecting click events
- **Impact:** Users cannot return to the report list from a report detail view without manually typing the URL or using browser back

### Date Formatting ✅
- Dates shown as "Mar 19, 2026" and "Mar 23, 2026" — human-readable ✅

### File Size Display ✅
- Shows sizes: 4KB, 21KB, 11KB, 13KB, 12KB, 0KB, 1KB, 1KB ✅

---

## Cross-Cutting Observations

### Potential Shared Routing Bug (BUG-MC2-001 + BUG-MC2-002)
Both critical bugs involve unexpected navigation to /factory. This strongly suggests a **shared root cause**:
- The Factory page is the page **immediately after** Docs in the sidebar navigation under "Automation"
- A click event handler may be bubbling up from interactive elements to a parent router component
- Or Next.js prefetch/navigation logic may have a race condition

### Data Freshness
- Initial API calls returned zeros (possible cold start), but subsequent calls returned accurate data
- All pages correctly display real data once loaded
- Auto-refresh was not explicitly tested but "Refresh" buttons work on all pages

---

## Test Matrix Summary

| Page | Renders | Data Accurate | Interactions | Bugs |
|------|---------|---------------|-------------|------|
| Calendar | ✅ | ✅ (with caveats) | ✅ Tabs work | 2 (Medium, Low) |
| Radar | ✅ | ✅ Verified | ✅ | 1 (Medium) |
| Settings | ✅ | ✅ Verified | N/A (read-only) | 1 (Low) |
| Docs | ✅ | ✅ | ❌ Click navigates away | 2 (Critical, Low) |
| Reports | ✅ | ✅ | ❌ Back button broken | 1 (Critical) |

### Overall: 7 bugs found
- 🔴 Critical: 2 (Docs click navigation, Reports back button)
- 🟡 Medium: 2 (Calendar stats misleading, Radar junk agents)
- 🟢 Low: 3 (Gvenik division "none", Week View empty, Sessions count)

---

*Report by Scout (Functional QA) — 2026-03-23*
