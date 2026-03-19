# Mission Control — QA Report
**Date:** 2026-03-19  
**Tested by:** Gvenik (main orchestrator)  
**Environment:** localhost:3001, Next.js 14.2.35, SQLite (better-sqlite3)

---

## Summary

| Category | Pass | Fail | Mock/Not Wired |
|----------|------|------|----------------|
| **Agents** | 6 | 0 | 0 |
| **Skills & Tools** | 5 | 0 | 0 |
| **Team** | 3 | 0 | 0 |
| **Office** | 2 | 0 | 1 |
| **Dashboard** | 1 | 0 | 3 |
| **Tasks** | 0 | 1 | 3 |
| **Sessions** | 0 | 0 | 2 |
| **Other Pages** | 0 | 0 | 10 |
| **APIs** | 8 | 0 | 0 |
| **TOTAL** | **25** | **1** | **19** |

---

## ✅ WORKING (Database-backed)

### Agents Page (`/agents`)
- [x] **List view** — shows all 5 agents from DB, grouped by division
- [x] **Search** — filters by name/role/id
- [x] **Division filter** — dropdown works correctly
- [x] **Detail view** — click agent shows full info (model, hierarchy, skills, tools, workspace)
- [x] **Edit view** — all fields editable, saves to DB via PATCH
- [x] **Create wizard** — 5-step wizard, deploys to DB, auto-returns to list

### Skills & Tools Page (`/skills-tools`)
- [x] **Skills tab** — 46 skills from DB, grouped by category
- [x] **Tools tab** — 14 tools from DB, grouped by category
- [x] **Search + category filter** — works on both tabs
- [x] **Create skill/tool** — modal form, saves to DB
- [x] **Delete skill/tool** — confirm dialog, removes from DB

### Team Page (`/team`)
- [x] **Org chart** — visual hierarchy renders correctly (Samvel → Gvenik → Atlas/Rover → Scout/Sentinel)
- [x] **Click card** — detail sidebar slides in
- [x] **Data from DB** — uses same `/api/deploy-agent` endpoint

### Office Page (`/office`)
- [x] **Robot agents rendered** — all 5 SVG robots at desks
- [x] **Interactive** — click to select, activity bubbles on hover

### APIs (all DB-backed)
- [x] `GET /api/deploy-agent` — returns all agents
- [x] `POST /api/deploy-agent` — creates agent + logs activity
- [x] `PATCH /api/deploy-agent` — updates agent + logs activity
- [x] `DELETE /api/deploy-agent` — retires agent + logs activity
- [x] `GET/POST/PATCH/DELETE /api/skills` — full CRUD
- [x] `GET/POST/PATCH/DELETE /api/tools` — full CRUD
- [x] `GET/POST /api/activities` — activity log with filtering
- [x] `GET/POST/PATCH/DELETE /api/tasks` — full CRUD

---

## ❌ BUGS

### BUG-001: Tasks page uses mock data, not DB [CRITICAL]
- **Page:** `/tasks`
- **Expected:** Kanban board shows tasks from `/api/tasks` (SQLite)
- **Actual:** Shows hardcoded mock tasks (Kanban columns with fake data)
- **Impact:** "New Task" modal creates task locally but doesn't persist to DB
- **API exists:** Yes — `/api/tasks` is fully functional but the page doesn't call it
- **Fix:** Rewrite tasks page to fetch from `/api/tasks` and POST/PATCH via API

---

## ⚠️ MOCK / NOT WIRED (Features that exist but use fake data)

### Dashboard (`/`)
| Feature | Status | Notes |
|---------|--------|-------|
| Active Sessions count | MOCK | Hardcoded `mockSessions.length` from `lib/api.ts` |
| Custom Tools count | MOCK | Reads from `localStorage` (old tool builder), not DB |
| Messages Today count | MOCK | Hardcoded to `47` |
| Recent Activity feed | MOCK | Hardcoded in `lib/api.ts`, not from `/api/activities` |
| Gateway online status | PARTIAL | Pings gateway but doesn't verify deeply |

### Sessions (`/sessions`)
| Feature | Status | Notes |
|---------|--------|-------|
| Session list | MOCK | Hardcoded `mockSessions` array |
| Refresh button | MOCK | Re-renders same mock data |
| Real gateway sessions | NOT WIRED | Should query OpenClaw gateway API |

### Tasks (`/tasks`)
| Feature | Status | Notes |
|---------|--------|-------|
| Kanban board | MOCK | Hardcoded tasks in component state |
| New Task modal | MOCK | Creates locally, doesn't persist |
| Drag & drop | MOCK | Status changes don't persist |
| Activity sidebar | MOCK | Fake activity entries |

### Content (`/content`)
- Entire page is hardcoded mock data (blog posts, videos, emails)
- "New Content" button exists but no backend

### Memory (`/memory`)
- Shows hardcoded memory entries (not from DB `memories` table)
- Daily/Long-term tabs exist but data is fake
- Search doesn't query real data

### Approvals (`/approvals`)
- Mock approval queue with hardcoded items

### Council (`/council`)
- Mock "AI Council" deliberation view

### Calendar (`/calendar`)
- Static mock calendar with fake events

### Projects (`/projects`)
- Hardcoded project cards

### People (`/people`)
- Static contact/people list

### Docs (`/docs`)
- Mock documentation browser

### Settings (`/settings`)
- Gateway URL field exists but "Save settings" doesn't persist
- Theme switcher (Dark/Light/System) doesn't persist
- Auth token field is cosmetic

### System (`/system`)
- Hardcoded system status

### Radar (`/radar`)
- Mock monitoring/radar view

### Factory (`/factory`)
- Mock "agent factory" view

### Pipeline (`/pipeline`)
- Mock CI/CD pipeline view

### Feedback (`/feedback`)
- Mock feedback collection

---

## 📋 RECOMMENDATIONS (Priority Order)

### P0 — Critical (should fix now)
1. **Wire Tasks page to DB** — API exists, just connect the frontend
2. **Wire Dashboard to real data** — pull activity from `/api/activities`, agent count from `/api/deploy-agent`

### P1 — High (should fix soon)
3. **Wire Office activity feed to DB** — use `/api/activities` instead of random generation
4. **Settings persistence** — save gateway URL and theme to DB or local config
5. **Wire Memory page to DB** — `memories` table exists, connect the frontend

### P2 — Medium (nice to have)
6. **Remove or label mock pages** — Content, Approvals, Council, Calendar, Projects, People, Docs should either be wired up or show "Coming Soon" states
7. **Gateway integration** — connect Sessions page to real OpenClaw gateway API
8. **Dashboard stats from real data** — session count, message count from gateway

### P3 — Low (future)
9. **WebSocket for live updates** — real-time activity feed
10. **Authentication** — protect the UI with at least a token
11. **Search across entities** — global search hitting agents, skills, tools, tasks

---

## 🏗️ Architecture Notes

### What's solid
- SQLite backend is clean, fast, WAL mode enabled
- API routes are consistent (all support proper CRUD)
- Activity logging is automatic on agent/task mutations
- Schema has room to grow (sessions, memories tables ready)

### What needs work
- 10+ pages are entirely static/mock — significant frontend-backend gap
- No data sync between DB and JSON registry files (dual source of truth risk)
- No error boundaries in React components
- No loading states on most pages (data appears after first load)
- `lib/api.ts` still has mock data that some pages import

---

*Report generated by Gvenik's QA process. Total pages tested: 18. Total API endpoints tested: 12.*
