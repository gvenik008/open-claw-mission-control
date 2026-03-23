# Security API Audit — Mission Control
**Date:** 2026-03-23  
**Tester:** Sentinel (qa-security)  
**Target:** localhost:3001 — `/api/sessions`, `/api/memory`, `/api/calendar`, `/api/metrics`  
**Scope:** Path traversal, injection, data exposure, headers, auth, rate limiting

---

## Executive Summary

**4 endpoints tested. 8 findings. 1 Critical, 2 High, 3 Medium, 2 Low.**

The path traversal fix on `/api/memory` is **solid** — all 11 bypass techniques blocked (403). However, the `/api/memory` endpoint has a critical data exposure issue: it serves cross-agent workspace files (including AGENTS.md which contains Telegram IDs, routing logic, and internal API architecture). No authentication is required on any endpoint. No rate limiting exists. Security headers are completely absent.

---

## Findings

### SEC-API-001 — No Authentication on Any Endpoint
| Field | Value |
|---|---|
| **Severity** | 🔴 CRITICAL |
| **Endpoint** | All four: `/api/sessions`, `/api/memory`, `/api/calendar`, `/api/metrics` |
| **Description** | All API endpoints are completely unauthenticated. Any client on the network can read all data without credentials. |
| **PoC** | `curl http://localhost:3001/api/memory?path=AGENTS.md` — returns full file contents including Telegram IDs, API routing logic, and internal architecture. `curl -H "Origin: http://evil.com" http://localhost:3001/api/sessions` — returns data, no CORS restriction. |
| **Impact** | If Mission Control is ever exposed beyond localhost (e.g., via tunnel, port forward, or binding to 0.0.0.0), all workspace data, agent configs, calendar, and metrics are accessible to anyone. AGENTS.md contains Samvel's Telegram ID (`579992648`), internal API structure, and routing rules. |
| **Remediation** | 1. Add authentication (API key, session token, or JWT). 2. Add CORS headers restricting to allowed origins only. 3. Ensure server binds to `127.0.0.1` only (verify in Next.js config). |

---

### SEC-API-002 — /api/memory Exposes Cross-Agent Workspace Files
| Field | Value |
|---|---|
| **Severity** | 🟠 HIGH |
| **Endpoint** | `/api/memory` |
| **Description** | The memory endpoint serves files from other agent workspaces using relative paths like `../workspace-qa-security/SOUL.md`. The file listing (no `path` param) also enumerates all agent workspace files with names, sizes, and modification dates. |
| **PoC** | `curl "http://localhost:3001/api/memory?path=../workspace-qa-security/SOUL.md"` → returns full SOUL.md (4,643 bytes) for the Sentinel agent. `curl "http://localhost:3001/api/memory"` → lists 19 files across 6 agent workspaces. |
| **Impact** | Any unauthenticated client can read all agent personality files, configuration, and workspace docs. While the `../` traversal to `/etc/passwd` is blocked, traversal within the `.openclaw/` directory tree is allowed by design — this may be intentional but widens the attack surface. |
| **Remediation** | 1. Restrict `/api/memory` to current workspace files only (no `../workspace-*` paths). 2. If cross-agent access is needed, require explicit agent ID parameter and validate against an allowlist. 3. Consider scoping file listing to the requesting agent's workspace. |

---

### SEC-API-003 — Sensitive Data in /api/memory File Listing
| Field | Value |
|---|---|
| **Severity** | 🟠 HIGH |
| **Endpoint** | `/api/memory` (no path param) |
| **Description** | The file listing response includes database memories (lessons) with full `agent_id`, `content`, `source`, and timestamps. AGENTS.md is readable and contains PII (Telegram ID), internal API routes, user proxy architecture, and deployment details. |
| **PoC** | `curl "http://localhost:3001/api/memory"` → response includes `dbMemories` array with 11 lesson records, agent IDs, and training content. `curl "http://localhost:3001/api/memory?path=AGENTS.md"` → exposes Telegram ID `579992648`, API routing logic, task/skill-match endpoints. |
| **Impact** | Information disclosure: internal system architecture, user PII, agent training data, and operational procedures exposed to any local network client. |
| **Remediation** | 1. Remove `dbMemories` from the default listing response (or put behind auth). 2. Consider filtering AGENTS.md content to remove PII before serving. 3. Add a `fields` parameter to control response detail level. |

---

### SEC-API-004 — Missing Security Headers on All Endpoints
| Field | Value |
|---|---|
| **Severity** | 🟡 MEDIUM |
| **Endpoint** | All four endpoints |
| **Description** | No security headers present. Missing: `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, `Strict-Transport-Security`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`. |
| **PoC** | `curl -sI http://localhost:3001/api/sessions` — only returns `content-type`, `vary`, `Date`, `Connection`, `Keep-Alive`. No security headers. |
| **Impact** | MIME sniffing attacks, clickjacking, and other browser-based attacks possible if endpoints are accessed via browser. |
| **Remediation** | Add Next.js security headers in `next.config.js`: ```js headers: async () => [{ source: '/api/:path*', headers: [ { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'X-Frame-Options', value: 'DENY' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, ] }] ``` |

---

### SEC-API-005 — No Rate Limiting on Any Endpoint
| Field | Value |
|---|---|
| **Severity** | 🟡 MEDIUM |
| **Endpoint** | All four endpoints |
| **Description** | 25 rapid sequential requests to `/api/sessions` all returned HTTP 200. No rate limiting, throttling, or request quotas are enforced. |
| **PoC** | `for i in $(seq 1 25); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/sessions; done` → all 200. |
| **Impact** | DoS potential. An attacker could hammer `/api/memory` with file reads to cause disk I/O pressure, or flood `/api/metrics` to stress database queries. |
| **Remediation** | Add rate limiting middleware (e.g., `express-rate-limit` or custom Next.js middleware). Suggested: 60 req/min per IP for read endpoints, 20 req/min for `/api/memory` (file I/O). |

---

### SEC-API-006 — Build ID Leakage in Error Responses
| Field | Value |
|---|---|
| **Severity** | 🟡 MEDIUM |
| **Endpoint** | All endpoints (405 error pages) |
| **Description** | Invalid method requests (POST to GET-only endpoints) return full Next.js HTML error pages containing the build ID (`Ap2off5PKrskqp15Y-6SK`) and framework-specific script paths. |
| **PoC** | `curl -X POST http://localhost:3001/api/sessions` → HTML response contains `buildId":"Ap2off5PKrskqp15Y-6SK"` and script paths like `/_next/static/chunks/webpack-9e3f3cdf6b78e172.js`. |
| **Impact** | Information leakage: build ID and chunk hashes reveal deployment version, framework (Next.js), and can be used to fingerprint the application. Webpack chunk names could aid further reconnaissance. |
| **Remediation** | 1. Return JSON error responses for API routes instead of HTML. 2. Add custom error handler in API routes: `res.status(405).json({ error: 'Method not allowed' })`. 3. Consider stripping build info from error responses in production. |

---

### SEC-API-007 — /api/memory No Path Param Returns Full Workspace Index
| Field | Value |
|---|---|
| **Severity** | 🟢 LOW |
| **Endpoint** | `/api/memory` (no `path` param) |
| **Description** | Calling `/api/memory` with no path parameter returns a full directory listing of all workspace files (19 files) across all agent workspaces, including file sizes, modification dates, agent names, and agent IDs. |
| **PoC** | `curl http://localhost:3001/api/memory` → returns `{"files":[...19 entries...],"dbMemories":[...11 entries...]}` |
| **Impact** | Enables reconnaissance: attacker learns exact file structure, agent names (Atlas, Scout, Sentinel, Rover, Prism), workspace layout, and which files were recently modified. |
| **Remediation** | 1. Require authentication for directory listing. 2. Consider requiring explicit `path` parameter (return 400 if missing). 3. At minimum, limit listing to current agent's workspace. |

---

### SEC-API-008 — Cached Responses May Serve Stale Data
| Field | Value |
|---|---|
| **Severity** | 🟢 LOW |
| **Endpoint** | `/api/sessions`, `/api/calendar`, `/api/metrics` |
| **Description** | Three of four endpoints return `x-nextjs-cache: HIT`, indicating responses are cached by Next.js. `/api/memory` (dynamic) does not have this header. |
| **PoC** | `curl -sI http://localhost:3001/api/sessions` → `x-nextjs-cache: HIT`. Same for `/api/calendar` and `/api/metrics`. |
| **Impact** | Low risk but could cause data freshness issues. In a multi-user scenario, cached responses could serve one user's data to another (if auth is later added without cache-busting). |
| **Remediation** | 1. Add `Cache-Control: no-store, no-cache` headers on API responses. 2. In Next.js API routes, use `export const dynamic = 'force-dynamic'` or `res.setHeader('Cache-Control', 'no-store')`. |

---

## Path Traversal Fix Verification ✅

The path traversal fix on `/api/memory` is **comprehensive and holds**. All tested vectors return `403 Access denied`:

| Vector | Status |
|---|---|
| `../../../etc/passwd` | ✅ 403 |
| `%2e%2e%2f%2e%2e%2fetc%2fpasswd` (URL-encoded) | ✅ 403 |
| `SOUL.md%00.txt` (null byte) | ✅ 403 |
| `/etc/passwd` (absolute path) | ✅ 403 |
| `..%252f..%252fetc%252fpasswd` (double-encoded) | ✅ 403 |
| `..\..\etc\passwd` (backslash) | ✅ 403 |
| `..%2f..%2f..%2fetc/passwd` (mixed encoding) | ✅ 403 |
| `....//....//etc/passwd` (filter bypass) | ✅ 403 |
| `SOUL.md/../../../etc/passwd` (symlink-style) | ✅ 403 |
| `..%25252f..%25252fetc%25252fpasswd` (triple-encoded) | ✅ 403 |
| `%c0%ae%c0%ae%c0%af...` (Unicode overlong) | ✅ 403 |

**Blocked file extensions also verified:**
| Extension | Status |
|---|---|
| `.env` | ✅ 403 |
| `.js` (server.js) | ✅ 403 |
| `.ts` (config.ts) | ✅ 403 |

**Valid paths still work:**
| Path | Status |
|---|---|
| `SOUL.md` | ✅ 200 |
| `memory/2026-03-23.md` | ✅ 200 |

---

## SQL Injection Testing ✅

All injection attempts returned normal responses (no errors, no data leakage). The endpoints appear to use parameterized queries or ignore unknown parameters entirely:

- `?limit=1' OR 1=1--` → normal response
- `?limit=1 UNION SELECT * FROM sqlite_master--` → normal response
- `?date=2026-03-23' OR 1=1--` → normal response
- `?range=all' OR 1=1--` → normal response

**Result: No SQL injection vulnerabilities detected.**

---

## Summary Table

| ID | Severity | Endpoint | Issue |
|---|---|---|---|
| SEC-API-001 | 🔴 Critical | All | No authentication |
| SEC-API-002 | 🟠 High | /api/memory | Cross-agent file access |
| SEC-API-003 | 🟠 High | /api/memory | PII & sensitive data in listing |
| SEC-API-004 | 🟡 Medium | All | Missing security headers |
| SEC-API-005 | 🟡 Medium | All | No rate limiting |
| SEC-API-006 | 🟡 Medium | All | Build ID leakage in errors |
| SEC-API-007 | 🟢 Low | /api/memory | Full workspace index without auth |
| SEC-API-008 | 🟢 Low | 3 endpoints | Cached responses |

---

## Recommendations Priority

1. **Immediate:** Add authentication to all API routes (SEC-API-001)
2. **Short-term:** Restrict `/api/memory` to current workspace, remove dbMemories from listing (SEC-API-002, SEC-API-003)
3. **Short-term:** Add security headers via Next.js config (SEC-API-004)
4. **Medium-term:** Add rate limiting middleware (SEC-API-005)
5. **Cleanup:** Return JSON errors for invalid methods, strip build info (SEC-API-006)
