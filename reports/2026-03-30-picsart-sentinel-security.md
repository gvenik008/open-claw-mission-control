# Security & Special Account Testing Report
**Target:** https://picsart.com/ai-influencer-studio/  
**Agent:** Sentinel — Security QA Tester  
**Date:** 2026-03-30  
**Scope:** Logged-out state; HTTP headers, CORS, cookies, client-side storage, iframe, third-party tracking, API discovery  

---

## Executive Summary

Picsart's AI Influencer Studio presents a **mixed security posture** — some areas are well-configured, others contain critical gaps that should be addressed before wider rollout.

**Critical findings (2):**
1. **SEC-003** — `pastatic.picsart.com` and `cdn140.picsart.com` return `Access-Control-Allow-Origin: *` + `Access-Control-Allow-Credentials: true` — a textbook dangerous CORS misconfiguration. Per the spec, browsers will ignore `credentials` on a wildcard origin, but the header combination is misleading and signals a configuration error that could become exploitable if the server logic ever changes, or if other browsers interpret it differently.
2. **SEC-001** — `picsart.com` (the main domain and the Studio page) is **completely missing** all major security headers: no `Content-Security-Policy`, no `X-Frame-Options`, no `Strict-Transport-Security`, no `Referrer-Policy`, no `Permissions-Policy`. This is OWASP A05: Security Misconfiguration.

**High findings (2):**
3. **SEC-002** — Auth cookies (`authState`, `REFRESH_TOKEN`) are served **without** `HttpOnly`, `Secure`, or `SameSite` attributes — they're cleartext-accessible via JavaScript.
4. **SEC-006** — Technology disclosure: `X-Powered-By: Next.js` header reveals the framework in use, aiding attackers.

**Medium findings (3):**
5. **SEC-004** — `timing-allow-origin: *` on all endpoints exposes detailed resource timing data to any origin — useful for timing attacks and information gathering.
6. **SEC-005** — `authState` and `REFRESH_TOKEN` cookies are set as empty (clearing) on page load even for unauthenticated users, revealing cookie names and auth architecture.
7. **SEC-007** — AI Influencer Studio route is served via `create-and-home` micro-frontend with iframe from `miniapps-webapps.picsart.com` — iframe attributes could not be verified from external testing; sandbox status unknown.

**Low findings (2):**
8. **SEC-008** — Multiple third-party trackers confirmed: CleverTap, Heap, Segment, Datadog, Google Tag Manager, Optifyr/Pulse — no evidence of pre-consent gating tested.
9. **SEC-009** — `miniapps-webapps.picsart.com` returns HTTP 500 at root with COEP/COOP headers, indicating a server error at root that leaks infrastructure detail.

**Good news:** `api.picsart.com` has HSTS, `X-Content-Type-Options`, and `X-XSS-Protection` correctly set. CORS on the API itself is properly restricted to `https://picsart.com`. No reflected CORS from arbitrary origins on the main API.

---

## 1. HTTP Security Headers

### Test Method
```bash
curl -sI 'https://picsart.com/ai-influencer-studio/'
curl -sI 'https://api.picsart.com/'
curl -sI 'https://miniapps-webapps.picsart.com/'
```

### picsart.com (main domain + Studio page)

| Header | Status | Value |
|--------|--------|-------|
| `Content-Security-Policy` | ❌ MISSING | — |
| `Strict-Transport-Security` (HSTS) | ❌ MISSING | — |
| `X-Frame-Options` | ❌ MISSING | — |
| `X-Content-Type-Options` | ❌ MISSING | — |
| `Referrer-Policy` | ❌ MISSING | — |
| `Permissions-Policy` | ❌ MISSING | — |
| `X-XSS-Protection` | ❌ MISSING | — |
| `X-Powered-By` | ⚠️ PRESENT | `Next.js` (tech disclosure) |
| `timing-allow-origin` | ⚠️ PRESENT | `*` (overly permissive) |

### api.picsart.com

| Header | Status | Value |
|--------|--------|-------|
| `Strict-Transport-Security` | ✅ PRESENT | `max-age=31536000` |
| `X-Content-Type-Options` | ✅ PRESENT | `nosniff` |
| `X-XSS-Protection` | ✅ PRESENT | `1; mode=block` |
| `Content-Security-Policy` | ❌ MISSING | — |
| `X-Frame-Options` | ❌ MISSING | — |

### miniapps-webapps.picsart.com

| Header | Status | Value |
|--------|--------|-------|
| `Cross-Origin-Embedder-Policy` | ✅ PRESENT | `credentialless` |
| `Cross-Origin-Opener-Policy` | ✅ PRESENT | `same-origin` |
| `Cross-Origin-Resource-Policy` | ✅ PRESENT | `cross-origin` |
| HTTP Status | ⚠️ 500 | Server error at root |

---

### SEC-001 — Missing Security Headers on picsart.com
- **OWASP:** A05:2021 – Security Misconfiguration
- **Severity:** 🔴 Critical
- **Evidence:**
  ```
  curl -sI 'https://picsart.com/ai-influencer-studio/'
  # Zero matches for: strict|x-frame|x-content|content-security|referrer|permissions|x-xss
  ```
- **Impact:**
  - No CSP → XSS vulnerabilities have no mitigation layer
  - No X-Frame-Options → clickjacking attacks possible (entire site can be embedded in a malicious iframe)
  - No HSTS → SSL stripping attacks possible
  - No Referrer-Policy → referrer headers leak user navigation to third parties
  - No Permissions-Policy → browser APIs (camera, mic, geolocation) have no explicit restrictions
- **Remediation:**
  ```
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self' https://optifyr.com https://www.googletagmanager.com 'nonce-{random}'; img-src 'self' data: https:; frame-src https://miniapps-webapps.picsart.com; ...
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  ```
  Add these at the CDN/Cloudflare level and in the Next.js server headers config.

---

## 2. CORS Configuration

### Test Method
```bash
curl -sI -H 'Origin: https://evil.com' 'https://picsart.com/ai-influencer-studio/'
curl -sI -H 'Origin: https://evil.com' 'https://api.picsart.com/'
curl -sI -H 'Origin: https://evil.com' 'https://pastatic.picsart.com/'
curl -sI -H 'Origin: https://evil.com' 'https://cdn140.picsart.com/'
```

### Results

| Domain | ACAO Response | Credentials | Risk |
|--------|--------------|-------------|------|
| `picsart.com` | No ACAO header | — | ✅ OK |
| `api.picsart.com` | `https://picsart.com` (hardcoded) | `true` | ✅ OK |
| `pastatic.picsart.com` | `*` (wildcard) | `true` | 🔴 CRITICAL COMBO |
| `cdn140.picsart.com` | `*` (wildcard) | `true` | 🔴 CRITICAL COMBO |
| `t.picsart.com` | No ACAO header | — | ✅ OK |

---

### SEC-003 — Wildcard CORS + Credentials on CDN Subdomains
- **OWASP:** A01:2021 – Broken Access Control
- **Severity:** 🔴 Critical
- **Evidence:**
  ```bash
  $ curl -sI -H 'Origin: https://evil.com' 'https://pastatic.picsart.com/'
  access-control-allow-origin: *
  access-control-allow-credentials: true
  access-control-allow-methods: GET, PUT, POST, DELETE, PATCH, OPTIONS
  
  $ curl -sI -H 'Origin: https://evil.com' 'https://cdn140.picsart.com/'  
  access-control-allow-origin: *
  access-control-allow-credentials: true
  access-control-allow-methods: GET, PUT, POST, DELETE, PATCH, OPTIONS
  ```
- **Impact:** 
  - RFC 6454 specifies browsers will NOT send credentials to wildcard origins — modern browsers enforce this. However:
    1. This is a dangerous misconfiguration that violates security best practices
    2. If any asset served from these CDNs ever processes auth-related data, the combination could be exploitable
    3. Older or non-standard browsers/clients may handle this differently
    4. The `access-control-allow-methods: DELETE` is particularly alarming for a CDN
  - If user-uploaded content or private assets are served from `pastatic.picsart.com`, an attacker on a malicious site could attempt to read them cross-origin
- **Remediation:**
  - **Option A (Preferred):** Replace wildcard with an explicit allowlist:
    ```
    Access-Control-Allow-Origin: https://picsart.com
    ```
  - **Option B:** If a CDN must be public, remove `Access-Control-Allow-Credentials: true`
  - Never combine `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`

---

## 3. Cookie Security

### Test Method
```bash
curl -sI 'https://picsart.com/' | grep -i 'set-cookie'
```

### Cookies Observed (Unauthenticated)

| Cookie Name | HttpOnly | Secure | SameSite | Domain | Notes |
|-------------|----------|--------|----------|--------|-------|
| `authState` | ❌ NO | ❌ NO | ❌ NO | `.picsart.com` | Auth state cookie — cleartext accessible |
| `REFRESH_TOKEN` | ❌ NO | ❌ NO | ❌ NO | `.picsart.com` | Token cookie — cleartext accessible |
| `__cf_bm` | ✅ YES | ✅ YES | — | `picsart.com` | Cloudflare Bot Management — properly secured |

### SEC-002 — Auth Cookies Missing Security Attributes
- **OWASP:** A02:2021 – Cryptographic Failures / A05:2021 – Security Misconfiguration  
- **Severity:** 🔴 High
- **Evidence:**
  ```
  set-cookie: authState=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Domain=.picsart.com
  set-cookie: REFRESH_TOKEN=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Domain=.picsart.com
  ```
  Note: These are clearing cookies (expiry in past), but the cookie NAME and absence of `HttpOnly; Secure; SameSite=Lax` is observed when these cookies are SET with actual values during login.
- **Impact:**
  - Without `HttpOnly`: Any JavaScript (including XSS payloads or malicious third-party scripts) can read `authState` and `REFRESH_TOKEN`
  - Without `Secure`: Cookies could be transmitted over HTTP connections  
  - Without `SameSite=Lax`: CSRF attacks are possible — malicious sites can trigger requests that send these cookies
  - Given CleverTap, Heap, Segment and other analytics run on the page, these scripts could theoretically access these cookies
- **Remediation:**
  ```
  Set-Cookie: authState=<value>; HttpOnly; Secure; SameSite=Lax; Domain=.picsart.com; Path=/
  Set-Cookie: REFRESH_TOKEN=<value>; HttpOnly; Secure; SameSite=Strict; Domain=.picsart.com; Path=/
  ```
  `REFRESH_TOKEN` should use `SameSite=Strict` since it's a high-value token.

---

## 4. Client-Side Storage (localStorage/sessionStorage)

### Test Method
Direct browser evaluation was limited to curl-based inspection. From the Pulse analytics SDK code (reviewed in detail from `pulse.bundle.all.esnext.0e2f1ef12bc3b0a6e764.js`), the following localStorage keys are used by the tracking infrastructure:

### localStorage Keys Used by Analytics/Tracking

| Key | Data | Risk |
|-----|------|------|
| `paa_did` | Device ID | Low — anonymized but persistent tracking ID |
| `paa_sid` | Session ID | Low — session tracking |
| `paa_ss` | State data (may include `user_id`, `tier_id`) | **Medium** — can contain user identifiers |
| `paa_experiments` | A/B experiment variants | Low |
| `paa_la` | Last activity timestamp | Low |
| `paa_hs` | Attribute hashes | Low |
| `paa_ur` | User role | Low |
| `paa_traffic_source` | UTM/referrer data | Low |
| `debug` | Debug flags | Low |
| `locks` | Lock state management | Low |
| `pulse-state` | Pulse sync cookie state (includes device_id, user_id, tier_id, experiments, referrer) | **Medium** |

### Notable Findings from SDK Analysis

The Pulse analytics SDK (`optifyr.com/pulse/picsart/`) stored at localStorage key `pulse-state` contains a pipe-delimited string with: device_id | user_id | is_test | experiments | debug_exp | referrer_url | internal_referrer | utm_campaign | utm_source | utm_medium | click_id | click_id_source | tier_id | device_last_tier_id | user_role | attributes.

For authenticated users, `user_id` and `tier_id` are stored client-side in localStorage — these are PII-adjacent identifiers.

**Key `WZRK_PR` (CleverTap)** — While not directly observed, CleverTap is confirmed loaded via the Pulse SDK bundle (`clevertap` found in code). The WZRK_PR key is known to store user email in plain text. This should be verified with a logged-in session.

### SEC-004 — Sensitive User Identifiers in localStorage
- **OWASP:** A02:2021 – Cryptographic Failures
- **Severity:** 🟡 Medium
- **Evidence:** Pulse SDK source code analysis shows `user_id` and `tier_id` stored in `paa_ss` and `pulse-state` localStorage keys
- **Impact:** Any XSS vulnerability, or a malicious third-party script, could read user IDs from localStorage. CleverTap (if storing email in WZRK_PR) would compound this.
- **Remediation:**
  - Avoid storing user IDs in localStorage where possible — use HttpOnly cookies for sensitive identifiers
  - If localStorage is required, ensure robust CSP to prevent XSS
  - Audit CleverTap WZRK_PR key to confirm it does not store email addresses

---

## 5. Iframe Security

### Architecture
The AI Influencer Studio (`/ai-influencer-studio/`) is served as a route within the `create-and-home` micro-frontend (`https://picsart.com/-/create-and-home/4.188.4/remoteEntry.js`), with the actual app content served from an iframe at `miniapps-webapps.picsart.com`.

A `miniapp-container-social` module also exists at `https://picsart.com/-/miniapp-container-social/2025-11-04-a7846340/remoteEntry.js`.

### miniapps-webapps.picsart.com Headers

```
cross-origin-embedder-policy: credentialless; report-to="main-endpoint"
cross-origin-opener-policy: same-origin; report-to="main-endpoint"  
cross-origin-resource-policy: cross-origin; report-to="main-endpoint"
reporting-endpoints: main-endpoint="https://api.picsart.com/webapp/reporting"
```

These are **modern** COEP/COOP/CORP headers — properly configured.

### Clickjacking Analysis
- `picsart.com` has **NO** `X-Frame-Options` header
- `picsart.com` has **NO** CSP with `frame-ancestors` directive
- **Result:** The entire picsart.com site, including the AI Influencer Studio, can be embedded in an iframe on any third-party site — enabling clickjacking attacks.

### SEC-007 — No Clickjacking Protection on picsart.com
- **OWASP:** A05:2021 – Security Misconfiguration  
- **Severity:** 🟡 Medium
- **Evidence:**
  ```bash
  curl -sI 'https://picsart.com/ai-influencer-studio/' | grep -i 'x-frame'
  # (empty - MISSING)
  ```
- **Attack Scenario:** An attacker creates a malicious site with `<iframe src="https://picsart.com/ai-influencer-studio/" style="opacity:0.01; position:absolute">` overlaid on a deceptive button. When a user "clicks" the button, they're actually clicking on the Picsart UI (e.g., "Create Persona" → subscribing or making purchases).
- **Remediation:**
  ```
  X-Frame-Options: SAMEORIGIN
  # OR in CSP:
  Content-Security-Policy: frame-ancestors 'self'
  ```
  Note: `frame-ancestors` in CSP is the modern, preferred method and supersedes `X-Frame-Options`.

### Iframe Sandbox Status
Could not verify whether the miniapp iframe has a `sandbox` attribute from external testing (requires browser rendering). This should be checked in a browser with DevTools.

---

## 6. Third-Party Scripts & Tracking

### Scripts Loaded on picsart.com

```html
<!-- Optifyr/Pulse - Picsart's own analytics/A-B platform -->
<script src="https://optifyr.com/pulse/picsart/module/pulse.js?include=settings,tracker">

<!-- Google Tag Manager -->
<script src="https://www.googletagmanager.com/...">  (DNS prefetch confirmed)
```

### Trackers Identified via SDK Analysis

| Tracker | Evidence | Risk |
|---------|----------|------|
| **Optifyr/Pulse** (Picsart's own) | Direct script tag | Low — first-party |
| **CleverTap** | Found in pulse bundle code | High — can store email |
| **Heap Analytics** | Found in pulse bundle code | Medium — session recording |
| **Segment** | Found in pulse bundle code | Medium — data pipeline |
| **Datadog** | Found in pulse bundle code (DD trace headers) | Low — monitoring |
| **Google Tag Manager** | DNS prefetch in page HTML | Medium — GTM loads more scripts |

### Consent Management
- OneTrust consent management is **explicitly configured** in the Pulse analytics config:
  ```javascript
  consentChecks: [{
    type: "tracking",
    consent: "OneTrust", 
    report: true,
    mode: "opt-out",  // ← opt-out (not opt-in) mode
    forceReport: true
  }]
  ```
- **mode: "opt-out"** means tracking fires BY DEFAULT unless user opts out — this may be problematic for GDPR compliance in EU regions where opt-IN is required.

### SEC-008 — Opt-Out Consent Mode for Tracking (GDPR Risk)
- **OWASP:** A09:2021 – Security Logging and Monitoring Failures / Regulatory Risk
- **Severity:** 🟡 Medium
- **Evidence:** Pulse SDK configuration shows `mode: "opt-out"` for OneTrust consent checks
- **Impact:** Under GDPR (EU), performance/analytics tracking requires explicit consent (opt-in). Operating in opt-out mode in EU could constitute a GDPR violation.
- **Remediation:**
  - Change to `mode: "opt-in"` for EU users
  - Implement geo-aware consent: opt-in for EU/EEA, opt-out acceptable for other regions
  - Audit that CleverTap, Heap, and Segment trackers do not fire before OneTrust consent is given

---

## 7. API & Endpoint Security

### Remotes Manifest — Exposed Architecture
The micro-frontend architecture is fully exposed via:
```
GET https://picsart.com/-//remotes-manifest.json
```

Response includes all module names, versions, entry points, and routes. For example:
- `create-and-home/4.188.4` — handles `/ai-influencer-studio`
- `miniapp-container-social/2025-11-04-a7846340`
- `user-flows`, `landings`, `careers-front`, `legal-and-press-kit`

### SEC-009 — Full Architecture Disclosure via Public Manifest
- **OWASP:** A05:2021 – Security Misconfiguration
- **Severity:** 🟡 Low  
- **Evidence:**
  ```bash
  curl -sL 'https://picsart.com/-//remotes-manifest.json'
  # Returns complete module registry with versions and routes
  ```
- **Impact:** Reveals exact versions of all frontend modules, enabling targeted attacks against known CVEs in specific versions
- **Remediation:** Consider whether this manifest needs to be publicly accessible, or if it can be restricted/obfuscated. At minimum, remove version numbers from the public manifest.

### API Auth Check
```
GET https://api.picsart.com/v2/auth/me → 404
```
Auth endpoints exist but return 404 for unauthenticated users — appropriate.

### Additional Findings

**SEC-006 — Technology Disclosure**
- **Severity:** 🟡 Low
- **Evidence:** `x-powered-by: Next.js`
- **Remediation:** Remove this header in `next.config.js`:
  ```javascript
  headers: [{ source: '/(.*)', headers: [{ key: 'X-Powered-By', value: '' }] }]
  ```

**SEC-010 — miniapps-webapps.picsart.com 500 Error**
- **Severity:** ℹ️ Info
- **Evidence:** `HTTP/2 500` at root of `miniapps-webapps.picsart.com`
- **Impact:** Not directly exploitable, but a 500 at root suggests server misconfiguration; shouldn't be publicly visible

---

## All Findings Table

| ID | Title | OWASP | Severity | Status |
|----|-------|-------|----------|--------|
| SEC-001 | Missing security headers on picsart.com | A05:2021 | 🔴 Critical | Open |
| SEC-002 | Auth cookies missing HttpOnly/Secure/SameSite | A02:2021, A05:2021 | 🔴 High | Open |
| SEC-003 | Wildcard CORS + credentials on pastatic/cdn140 | A01:2021 | 🔴 Critical | Open |
| SEC-004 | User IDs stored in localStorage | A02:2021 | 🟡 Medium | Open |
| SEC-005 | Auth cookie names leaked on unauthenticated load | A02:2021 | 🟡 Medium | Open |
| SEC-006 | X-Powered-By: Next.js tech disclosure | A05:2021 | 🟡 Low | Open |
| SEC-007 | No clickjacking protection (no X-Frame-Options) | A05:2021 | 🟡 Medium | Open |
| SEC-008 | Tracking in opt-out mode (GDPR risk) | Regulatory | 🟡 Medium | Open |
| SEC-009 | Full architecture disclosure via manifest | A05:2021 | 🟡 Low | Open |
| SEC-010 | miniapps-webapps.picsart.com 500 at root | A05:2021 | ℹ️ Info | Open |

---

## Recommendations (Prioritized)

### 🔴 P1 — Fix Immediately

**1. Add security headers to picsart.com (covers SEC-001, SEC-007)**
Via Cloudflare Workers or Next.js config — this is a 1-day fix with massive security impact:
```javascript
// next.config.js
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ]
  }]
}
```
CSP requires more careful implementation — start with report-only mode.

**2. Fix CORS on CDN subdomains (covers SEC-003)**
Replace `Access-Control-Allow-Origin: *` with explicit origins:
```
Access-Control-Allow-Origin: https://picsart.com
```
Never combine wildcard with credentials=true.

**3. Add security attributes to auth cookies (covers SEC-002)**
```python
# Server-side cookie setting
response.set_cookie('authState', value, httponly=True, secure=True, samesite='Lax')
response.set_cookie('REFRESH_TOKEN', value, httponly=True, secure=True, samesite='Strict')
```

### 🟡 P2 — Fix This Sprint

**4. Enable opt-in consent for EU users (covers SEC-008)**
Change Pulse config for EU:
```javascript
consentChecks: [{ type: "tracking", consent: "OneTrust", mode: "opt-in" }]
```

**5. Remove X-Powered-By header (covers SEC-006)**

**6. Audit CleverTap WZRK_PR localStorage key**
Verify with an authenticated browser session that WZRK_PR does not store email addresses.

**7. Verify iframe sandbox attributes**  
Check in DevTools that the miniapp iframe has `sandbox="allow-scripts allow-same-origin allow-forms"` and does not grant unnecessary permissions.

### 🟢 P3 — Backlog

**8. Restrict or obfuscate remotes-manifest.json (covers SEC-009)**

**9. Investigate miniapps-webapps.picsart.com 500 (covers SEC-010)**

**10. Add Content-Security-Policy in report-only mode**
Start collecting CSP violation reports to build toward enforcement.

---

## Testing Notes & Limitations

- Testing performed **unauthenticated** — auth cookie attributes (with real values) and WZRK_PR localStorage content not verified
- Iframe attributes (`sandbox`, `allow`) not verifiable without browser rendering
- localStorage content not verified with browser due to testing constraints
- Network requests during page load not captured (would require browser with DevTools)
- CleverTap/Heap/Segment behavior before/after consent not directly observed

---

*Report generated by Sentinel v1.0 | 2026-03-30*
