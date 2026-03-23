# Functional QA Report: New Mission Control Pages
**Date:** 2026-03-23  
**Tester:** Scout (Functional QA)  
**Target:** http://localhost:3001  
**Pages:** Sessions, Memory, Pipeline, Factory  

---

## Summary
| Page | Status | Bugs Found | Overall |
|------|--------|------------|---------|
| Sessions (/sessions) | ✅ Tested | 1 | Good — works correctly with empty data |
| Memory (/memory) | ✅ Tested | 2 | Good — file viewer works, minor badge issues |
| Pipeline (/pipeline) | ✅ Tested | 1 | Excellent — filters, stats, kanban all work |
| Factory (/factory) | ✅ Tested | 2 | Good — templates display well, clone section broken |

**Total Bugs Found:** 6  
**Critical:** 0 | **High:** 1 | **Medium:** 4 | **Low:** 1

---

## Page 1: Sessions (/sessions)

### What Works ✅
- **Page loads correctly** with heading "Sessions" and subtitle "Live agent session monitoring and history"
- **Stats cards display:** Active (0), Total Sessions (0), Completed (0), Recent Events (0)
- **Active/Recent tabs switch correctly** — clicking between "Active (0)" and "Recent (0)" changes view content
- **Active tab empty state:** Shows "No active sessions right now" with icon
- **Recent tab empty state:** Shows "No recent sessions found"
- **Refresh button** present and functional
- **Recent Agent Activity section** shows "No recent activity"
- **API consistency:** `/api/sessions` returns `{"sessions":[],"recentRuns":[]}` — UI matches
- **No console errors** detected
- **Navigation sidebar:** All links present and correct

### What Couldn't Be Verified
- Session card colors (running=green, done=blue, timeout=orange, error=red) — no sessions exist to test
- Auto-refresh behavior — no changing data to observe
- Activity timeline with actual data

### Bugs Found
**BUG-MC-001** — Auto-refresh not verifiable  
- **Severity:** Low  
- **Page:** Sessions  
- **Description:** Cannot verify auto-refresh works without active sessions. No visible auto-refresh indicator (countdown, spinner) to confirm it's running.  
- **Expected:** A subtle refresh indicator or timestamp showing last refresh time  
- **Actual:** No visible feedback that auto-refresh is active  

---

## Page 2: Memory (/memory)

### What Works ✅
- **Page loads correctly** with heading "Memory" and search box
- **Left sidebar file tree grouped by agent:**
  - Main (Gvenik): SOUL.md, USER.md, IDENTITY.md, AGENTS.md, TOOLS.md, HEARTBEAT.md, 2026-03-23.md, 2026-03-19.md, 2026-03-19-task-routing.md, 2026-03-18.md
  - Atlas: SOUL.md, AGENTS.md
  - Scout: SOUL.md, AGENTS.md
  - Sentinel: SOUL.md, AGENTS.md
  - Rover: SOUL.md, AGENTS.md
  - Prism: SOUL.md
- **All 6 agents listed** ✅ (Main/Gvenik, Atlas, Scout, Sentinel, Rover, Prism)
- **File type badges shown:** "Config" for config files, "Daily" for daily notes, "Agent Config" for agent files
- **File sizes displayed correctly:** e.g., SOUL.md = 1.6KB, AGENTS.md = 11.8KB
- **File count:** "19 files available" shown
- **Click file → content loads in right panel** ✅ (confirmed with SOUL.md)
- **Markdown rendering works:** Headers (h1, h2), bold text, paragraphs, list items all render properly
- **Close button** on content viewer works
- **DB memories section:** Shows "11 DB memories" count + "Knowledge Base (11 entries)" heading
- **Each DB memory shows:** type badge (lesson), category (qa-functional, qa-security, etc.), relative time (5h ago, 6h ago), and content text
- **Search box** present with placeholder "Search files..."

### Bugs Found

**BUG-MC-002** — Config badge color mismatch  
- **Severity:** Medium  
- **Page:** Memory  
- **Description:** Config file badges appear teal/dark-colored instead of purple as specified  
- **Expected:** Config badges = purple, Daily badges = blue, Agent Config = emerald  
- **Actual:** Config badges appear as dark teal/green-gray. Daily badges appear blue (correct). Agent Config appears teal (not emerald).  
- **Steps to Reproduce:** Navigate to /memory, observe badge colors next to file names  

**BUG-MC-003** — Modified date not shown on file list items  
- **Severity:** Medium  
- **Page:** Memory  
- **Description:** File list shows file size but not the modified date in the sidebar  
- **Expected:** Each file shows both file size AND modified date  
- **Actual:** Only file size shown (e.g., "Config 1.6KB"). Modified date only appears in the detail view header ("5d ago")  
- **Steps to Reproduce:** Navigate to /memory, observe file entries in left sidebar  

---

## Page 3: Pipeline (/pipeline)

### What Works ✅
- **Page loads correctly** with heading "Pipeline" and subtitle "Task execution workflow across agents"
- **Stats bar at top:** Total Tasks (29), Completion Rate (41%), Active Tasks (5), Active Agents (2)
- **4 columns visible:** Pending (12), In Progress (5), Review (0), Done (12)
- **Column counts:** 12 + 5 + 0 + 12 = 29 = Total Tasks ✅
- **Tasks appear in correct columns:**
  - Pending: Feature requests and QA tasks with status pending
  - In Progress: 5 running QA tasks (cross-page nav, sessions, memory, pipeline, factory testing)
  - Review: Empty ("No tasks")
  - Done: 12 completed tasks including security fixes and functional tests
- **Agent name/avatar shown:** Each task shows agent initials (QL, QF, QS, QG) + agent ID (qa-lead, qa-functional, qa-security, qa-general)
- **Priority badges displayed:** P0, P1, P2, P3 visible on task cards
- **P0 = red** ✅ (Fix: Memory API, Security: New API Routes)
- **P1 = orange** ✅ 
- **P2 = yellow** ✅
- **P3 = gray** ✅ (Feature: Settings — Editable Configuration)
- **Running status indicator:** Green dot + "Running" text on in-progress tasks
- **Relative timestamps:** "4h ago", "5h ago", "3d ago", "4d ago" shown
- **Filter by agent dropdown works** ✅ — Options: All Agents, Gvenik, Atlas, Scout, Sentinel, Rover, Prism
  - Tested: Sentinel filter → showed 5 tasks, all qa-security, task count updated to "5 tasks"
- **Filter by priority dropdown works** ✅ — Options: All Priorities, Urgent (P0), High (P1), Medium (P2), Low (P3)
  - Tested: P0 filter → showed 2 tasks in Done column
- **Task count matches API:** 29 tasks displayed (confirmed via API)
- **Refresh button** present and functional
- **"Unassigned" label** shown for tasks without an assignee

### Bugs Found

**BUG-MC-004** — Stats bar doesn't update when filters are applied  
- **Severity:** Medium  
- **Page:** Pipeline  
- **Description:** When filtering by agent or priority, the top stats bar (Total Tasks, Completion Rate, Active Tasks, Active Agents) still shows overall numbers, not filtered numbers  
- **Expected:** Stats should reflect filtered view (e.g., filtering Sentinel should show "5 tasks" in Total Tasks stat)  
- **Actual:** Stats bar still shows 29 Total Tasks, 41% Completion Rate even when filtered down to 5 tasks. Only the "X tasks" text next to filters updates.  
- **Steps to Reproduce:** Navigate to /pipeline → select "Sentinel" from agent dropdown → observe stats bar still shows 29  

---

## Page 4: Factory (/factory)

### What Works ✅
- **Page loads correctly** with heading "Factory" and subtitle "Create agents from templates or clone existing ones"
- **9 agent templates displayed** ✅:
  1. QA Lead (qa) — with skills: browser-testing, security-testing, api-testing, +1
  2. Functional QA (qa) — with skills: browser-testing, ui-testing, regression-testing
  3. Security QA (qa) — with skills: security-testing, penetration-testing, owasp
  4. General QA (qa) — with skills: browser-testing, api-testing
  5. Product Manager (product) — with skills: product-strategy, user-research, requirements-writing
  6. Backend Dev (engineering) — with skills: backend-engineering, database-design, api-design
  7. Frontend Dev (engineering) — with skills: frontend-engineering, react, typescript
  8. DevOps (engineering) — with skills: devops, docker, ci-cd, +1
  9. Research Analyst (research) — with skills: research, data-analysis, report-writing
- **Each template has:** name, category badge, description, skill tags, "Use Template" button
- **Category badges:** QA templates tagged "qa", engineering templates tagged "engineering", etc.
- **"Create from Scratch" button** present
- **"Recently Created" section** shows "No agents yet"
- **Refresh button** present
- **Layout:** 3-column grid for templates, sidebar with Clone and Recently Created sections

### Bugs Found

**BUG-MC-005** — Clone Existing Agent shows "No agents available" despite having 6 active agents  
- **Severity:** High  
- **Page:** Factory  
- **Description:** The "Clone Existing Agent" section shows "No agents available to clone" even though 6 agents exist (Gvenik, Atlas, Scout, Sentinel, Rover, Prism)  
- **Expected:** Dropdown should list all 6 active agents available for cloning  
- **Actual:** Shows "No agents available to clone"  
- **Steps to Reproduce:** Navigate to /factory → scroll to "Clone Existing Agent" section  
- **Root Cause Theory:** The Factory page may not be fetching the agent list from `/api/deploy-agent`, or the data isn't being mapped to the clone dropdown  

**BUG-MC-006** — API agent creation returns "Missing required fields" with seemingly complete payload  
- **Severity:** Medium  
- **Page:** Factory (API)  
- **Description:** POST to `/api/deploy-agent` with all visible fields returns "Missing required fields" error  
- **Expected:** Creating an agent with agent_id, name, role, type, division, lead, model, skills, tools, personality, workspace should succeed  
- **Actual:** Returns `{"error":"Missing required fields"}` even with comprehensive payload  
- **Steps to Reproduce:** `curl -X POST http://localhost:3001/api/deploy-agent -H 'Content-Type: application/json' -d '{"agent_id":"test-bot","name":"TestBot","role":"test","type":"worker","division":"test","lead":"main","model":"anthropic/claude-sonnet-4-6","skills":["test"],"tools":["shell"],"personality":"test bot","workspace":"~/.openclaw/workspace-test-bot"}'`
- **Impact:** "Use Template" and "Create from Scratch" features likely fail if the API doesn't accept the payload  

---

## Cross-Page Observations

### Design Consistency ✅
- All 4 pages share consistent sidebar navigation, header styling, and dark theme
- Stats cards use the same layout pattern (Pipeline and Sessions)
- Buttons have consistent styling (Refresh, Use Template, Create from Scratch)
- Font sizing and spacing appear consistent across pages

### Navigation ✅
- Sidebar correctly highlights the current page
- All sidebar links work correctly for direct navigation
- Page titles and subtitles are descriptive and consistent

### Missing Features / Enhancement Suggestions
1. **Sessions:** Consider adding mock/sample session data or a "Start Test Session" button for demo purposes
2. **Memory:** Add file editing capability (edit button on file viewer)
3. **Pipeline:** Add drag-and-drop between columns for manual status changes
4. **Factory:** Add a delete/archive option for created agents
5. **All pages:** Add loading skeletons/spinners during data fetch

---

## Test Environment
- **URL:** http://localhost:3001
- **Browser:** Automated (Playwright via OpenClaw)
- **No console errors detected** on any page
- **Gateway status:** Online (v0.1.0)
