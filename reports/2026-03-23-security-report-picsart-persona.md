# Security Assessment Report: Picsart AI Influencer Studio (Persona)
**Date:** 2026-03-23  
**Target:** https://picsart.com/ai-influencer-studio  
**Tester:** Sentinel (Security QA)  
**Status:** Completed

---

## Executive Summary

The Picsart AI Influencer Studio ("Picsart Persona") is a 4-step wizard for creating AI-generated personas/influencers, marketed with an "Earn up to $3,500" monetization angle. The application runs as a cross-origin "miniapp" iframe (`miniapps-webapps.picsart.com`) embedded within the main `picsart.com` domain.

**Overall Risk: MEDIUM-HIGH** — Multiple security misconfigurations found across CORS, security headers, data privacy, and client-side storage. No critical remote code execution or authentication bypass found, but the combination of findings creates a significant attack surface.

**Findings Summary:**
- Critical: 1
- High: 3
- Medium: 5
- Low: 4
- Info: 5

---

## Findings

---

### SEC-001: Missing Security Headers on Main Application
- **Severity:** High
- **OWASP Category:** A05:2021-Security Misconfiguration
- **Location:** `https://picsart.com/ai-influencer-studio/` (HTTP response headers)
- **Description:** The main application page is missing critical security headers including:
  - **No Content-Security-Policy (CSP)** — neither HTTP header nor meta tag
  - **No X-Frame-Options** header — page can be framed by any origin
  - **No X-Content-Type-Options** header
  - **No Strict-Transport-Security (HSTS)** header
  - **No Referrer-Policy** header
  - **No Permissions-Policy** header
  - `timing-allow-origin: *` allows any origin to measure resource timing
- **Proof of Concept:**
  ```bash
  curl -sI 'https://picsart.com/ai-influencer-studio/' | grep -iE '(strict|x-frame|x-content|content-security|referrer-policy|permissions-policy)'
  # Returns empty — none of these headers are set
  ```
- **Impact:** Enables clickjacking attacks, MIME-type sniffing attacks, and resource timing side-channels. Without CSP, XSS payloads face no policy barrier.
- **Remediation:**
  - Add `Content-Security-Policy` with strict script-src directives
  - Add `X-Frame-Options: DENY` or use CSP `frame-ancestors 'self'`
  - Add `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - Add `X-Content-Type-Options: nosniff`
  - Add `Referrer-Policy: strict-origin-when-cross-origin`
  - Remove or restrict `timing-allow-origin`

---

### SEC-002: CORS Misconfiguration — Wildcard Origin with Credentials on CDN
- **Severity:** Critical
- **OWASP Category:** A05:2021-Security Misconfiguration
- **Location:** `cdn-cms-uploads.picsart.com`, `cdn140.picsart.com`
- **Description:** Multiple CDN endpoints return `Access-Control-Allow-Origin: *` combined with `Access-Control-Allow-Credentials: true`. Per the CORS specification, browsers should reject this combination, but older browsers or custom HTTP clients may not enforce this. More importantly, the presence of `Access-Control-Allow-Credentials: true` on a wildcard origin indicates a fundamental misconfiguration in the CORS policy that could affect other endpoints sharing the same configuration.
- **Proof of Concept:**
  ```bash
  curl -sI -H 'Origin: https://evil.com' 'https://cdn140.picsart.com/69624423237702047608.json'
  # Returns:
  # access-control-allow-origin: *
  # access-control-allow-credentials: true
  # access-control-allow-methods: GET, PUT, POST, DELETE, PATCH, OPTIONS
  ```
- **Impact:** If any CDN endpoint serves user-specific or sensitive data with cookies, an attacker could read it from any origin. The `DELETE, PATCH, POST` methods being allowed is particularly concerning.
- **Remediation:**
  - Never combine `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`
  - If credentials are needed, reflect the requesting origin from an allowlist
  - Restrict allowed methods to only what's needed (likely just `GET` for CDN)
  - Apply these fixes to all CDN/S3 bucket configurations

---

### SEC-003: API CORS Reflects Arbitrary Subdomains with Credentials
- **Severity:** High
- **OWASP Category:** A05:2021-Security Misconfiguration
- **Location:** `api.picsart.com`
- **Description:** The API server reflects any `*.picsart.com` subdomain as an allowed origin with credentials. While it correctly blocks external origins (only reflects `picsart.com` subdomains), this creates risk if ANY subdomain can be compromised or taken over. The staging/test subdomains showed DNS resolution failures, which could indicate subdomain takeover opportunities.
- **Proof of Concept:**
  ```bash
  curl -sI -H 'Origin: https://anything.picsart.com' 'https://api.picsart.com/'
  # Returns:
  # access-control-allow-origin: https://anything.picsart.com
  # access-control-allow-credentials: true
  
  # staging.picsart.com and test.picsart.com have no DNS records (takeover risk)
  dig +short staging.picsart.com  # no records
  dig +short test.picsart.com     # no records
  ```
- **Impact:** An attacker who takes over any unused `*.picsart.com` subdomain could make credentialed API requests on behalf of any logged-in user, accessing their personas, account data, and potentially modifying content.
- **Remediation:**
  - Maintain an explicit allowlist of permitted origins instead of wildcard subdomain matching
  - Audit and clean up unused DNS records for `*.picsart.com` subdomains
  - Monitor for subdomain takeover attempts

---

### SEC-004: Excessive PII in Client-Side Storage (localStorage)
- **Severity:** High
- **OWASP Category:** A04:2021-Insecure Design
- **Location:** `localStorage` on `picsart.com`
- **Description:** The application stores extensive PII in localStorage (61 keys), including:
  - **Email address** in plaintext (`WZRK_PR` key: `cocosik_agent2@gmail.com`)
  - **Email in base64** (`asShopperInputInfo` key)
  - **Username** (`cocosik_agent2`)
  - **User ID** (numeric: `511638607014101`)
  - **Device fingerprint** and session identifiers
  - **Geographic location** (`geo_zone`: Armenia, Yerevan)
  - **Subscription status** (`free`)
  - **reCAPTCHA tokens** (`_grecaptcha`)
  - **PayPal storage data** (`__paypal_storage__`)
  - **CleverTap analytics profile** with full identity
  - **Login methods history** with email/provider
  - **GDPR consent status** (`datareg_gdpr_consented: false`)
- **Proof of Concept:** Run in browser console:
  ```javascript
  JSON.parse(decodeURIComponent(localStorage.getItem('WZRK_PR')))
  // Returns: {device_id: "...", Name: "cocosik_agent2", Identity: 511638607014101, Email: "cocosik_agent2@gmail.com"}
  ```
- **Impact:** Any XSS vulnerability (even in a third-party script) can exfiltrate all user PII. localStorage is accessible to any JavaScript running on the same origin, including analytics scripts and potential malicious injections.
- **Remediation:**
  - Minimize PII stored in localStorage — use server-side sessions for sensitive data
  - Never store email/username in client-side storage
  - Use HttpOnly cookies for authentication tokens
  - Encrypt any necessary client-side data
  - Audit third-party SDK localStorage usage (CleverTap, AddShoppers)

---

### SEC-005: Unsandboxed Cross-Origin Miniapp iframe with Excessive Permissions
- **Severity:** Medium
- **OWASP Category:** A04:2021-Insecure Design
- **Location:** iframe element `#8083fdff-...-miniapp-frame-com.picsart.ai-influencer-studio`
- **Description:** The Persona miniapp runs in an iframe with **no sandbox attribute** and excessive `allow` permissions:
  ```
  allow="camera; microphone; autoplay; fullscreen; clipboard-write; clipboard-read; geolocation; web-share"
  ```
  The miniapp at `miniapps-webapps.picsart.com` is granted access to camera, microphone, clipboard, and geolocation — none of which are needed for AI persona creation.
- **Proof of Concept:**
  ```javascript
  var iframe = document.querySelector('iframe[id*="miniapp-frame"]');
  console.log(iframe.getAttribute('allow'));
  // "camera; microphone; autoplay; fullscreen; clipboard-write; clipboard-read; geolocation; web-share"
  console.log(iframe.getAttribute('sandbox'));
  // null (no sandbox!)
  ```
- **Impact:** If the miniapp subdomain is compromised, an attacker gets full access to camera, microphone, clipboard, and geolocation APIs without any user prompt (since the parent page already granted permission). Without sandbox, the iframe can also navigate the top-level page and open popups.
- **Remediation:**
  - Add `sandbox="allow-scripts allow-same-origin allow-forms"` (minimum needed)
  - Remove unnecessary `allow` permissions (camera, microphone, geolocation, clipboard-read)
  - Apply least-privilege principle to iframe permissions

---

### SEC-006: Sensitive Cookies Accessible via JavaScript (No HttpOnly)
- **Severity:** Medium
- **OWASP Category:** A02:2021-Cryptographic Failures
- **Location:** Cookies on `picsart.com` domain
- **Description:** 29 cookies are accessible via `document.cookie`, including security-sensitive ones:
  - `authState` — reveals authentication status
  - `gtm_user_id` — exposes user's numeric ID (511638607014101)
  - `pulse-state` — contains device ID, user ID, subscription tier, and experiment groups
  - `encKJASd73` — appears to be an encrypted/encoded session token
  - `WZRK_G` and `WZRK_S_485-99W-RK7Z` — CleverTap session identifiers
- **Proof of Concept:**
  ```javascript
  document.cookie.split(';').map(c => c.trim().split('=')[0])
  // Returns 29 cookie names all accessible from JS
  ```
- **Impact:** Any XSS attack can steal all cookies including auth state and user identifiers.
- **Remediation:**
  - Set `HttpOnly` flag on all authentication-related cookies
  - Set `SameSite=Strict` or `SameSite=Lax` on session cookies
  - Minimize cookie count; consolidate where possible

---

### SEC-007: Clickjacking Vulnerability — No Frame Protection
- **Severity:** Medium
- **OWASP Category:** A04:2021-Insecure Design
- **Location:** `https://picsart.com/ai-influencer-studio/`
- **Description:** The page has no `X-Frame-Options` header and no CSP `frame-ancestors` directive. The page can be embedded in an iframe on any malicious website, enabling clickjacking attacks.
- **Proof of Concept:**
  ```html
  <iframe src="https://picsart.com/ai-influencer-studio/" width="800" height="600" style="opacity:0.01;position:absolute;top:0;left:0;"></iframe>
  ```
  An attacker can overlay invisible iframe elements to trick users into:
  - Clicking "Create New" (consuming credits)
  - Selecting specific persona options
  - Sharing/downloading personas unknowingly
- **Impact:** Users could unknowingly trigger actions (credit consumption, content generation, sharing) while thinking they're interacting with another site.
- **Remediation:**
  - Add `X-Frame-Options: DENY` header
  - Add CSP `frame-ancestors 'self'` directive
  - Implement frame-busting JavaScript as defense-in-depth

---

### SEC-008: Internal Infrastructure Information Disclosure
- **Severity:** Medium
- **OWASP Category:** A01:2021-Broken Access Control
- **Location:** Multiple endpoints
- **Description:** The application exposes internal infrastructure details:
  1. **Remotes Manifest** (`/remotes-manifest.json`) — lists all microservice versions, routes, and module federation entry points with exact version numbers (e.g., `app-shell/2.130.5`, `create-and-home/4.188.3`, `user-flows/3.24.1`)
  2. **Hidden route** revealed: `/cd8ecad4e6141ee2b5283a4e` mapped as `aiToolkit` (obscured but discoverable)
  3. **Dev console** exposed via `dev.picsart.com` → `console.picsart.io`
  4. **Miniapp ID** exposed in console logs: `f02f6304-06fd-4ca6-8d24-e125c5f182d5`
  5. **S3 bucket headers** exposed: `x-amz-request-id`, `x-amz-id-2`
  6. **Datadog tracing headers** exposed in `access-control-allow-headers`
  7. **Reporting endpoint** at `https://api.picsart.com/webapp/reporting`
- **Proof of Concept:**
  ```bash
  curl -s 'https://picsart.com/-/remotes-manifest.json' | jq '.remotes[].name'
  # Returns: landings, create-and-home, careers-front, user-flows, ...
  ```
- **Impact:** Attackers can map the full application architecture, identify specific service versions for CVE targeting, and discover hidden/internal endpoints.
- **Remediation:**
  - Restrict access to `remotes-manifest.json` or serve it only to authenticated requests
  - Remove S3 headers from public responses
  - Audit and remove hidden routes from the manifest
  - Use proper dev/staging isolation (not accessible from public DNS)

---

### SEC-009: Excessive Third-Party Tracking with PII Leakage
- **Severity:** Medium
- **OWASP Category:** A09:2021-Security Logging and Monitoring Failures
- **Location:** Multiple third-party integrations
- **Description:** The application loads and shares user PII with numerous third-party services:
  - **CleverTap** (`clevertap-prod.com`) — receives full user profile (name, email, ID)
  - **AddShoppers** (`addshoppers.com`, `nytrng.com`) — receives shopper data, email (base64), session
  - **Optifyr** (`optifyr.com`) — receives analytics data including subscription tier
  - **AppsFlyer** — receives user attribution data
  - **Google Analytics** (`_ga`, `_gcl_au`)
  - **Facebook Pixel** (`_fbp`)
  - **Bing Ads** (`_uetsid`, `_uetvid`)
  - **LinkedIn** (`_li_dcdm_c`, `_li_ss`, `_lc2_fpi`)
  - **Impact Radius** (`IR_gbd`, `IR_11703`, `IR_PI`)
  - **Datadog** (performance monitoring)
  - **FullStory** (`_fs_tab_id` in sessionStorage)
  - Hidden tracker iframe: `nytrng.com/iframe?vcp=4dd5h0np&as_id=...`
- **Proof of Concept:** localStorage key `WZRK_PR` contains full user identity sent to CleverTap. Cookie `pulse-state` contains `device_id|user_id||experiment:variant|||||||||subscription|tier`.
- **Impact:** User PII shared across 12+ third-party services. GDPR compliance concern: the `asShopperData` key shows `datareg_gdpr_consented: false` yet data is being actively collected and shared.
- **Remediation:**
  - Audit all third-party scripts for PII handling
  - Implement proper consent management before loading tracking scripts
  - Minimize PII shared with analytics services (use hashed/pseudonymized identifiers)
  - Block tracking scripts until explicit user consent is granted
  - Address the `datareg_gdpr_consented: false` flag — data collection should stop if consent is not given

---

### SEC-010: Wizard Step Bypass via URL Parameter Manipulation
- **Severity:** Low
- **OWASP Category:** A04:2021-Insecure Design
- **Location:** URL parameter `personaStep`
- **Description:** The wizard step can be changed by directly modifying the `personaStep` URL parameter. Navigating to `personaStep=4` loads the final "Share" step, showing a previously created persona with all steps marked as complete.
- **Proof of Concept:**
  ```
  https://picsart.com/ai-influencer-studio/?pathname=%2Fai-influencer-studio%2F&personaStep=4
  ```
  This loads the completed state with an existing persona (tested: "Onyx" character appeared).
- **Impact:** Low direct impact since the server appears to validate state server-side (shows previously created persona, not a new one). However, it reveals that wizard state is client-controllable and could confuse the UX or be chained with other issues.
- **Remediation:**
  - Validate step progression server-side
  - Don't allow URL parameter to override wizard state
  - Redirect to the correct step based on server-side state

---

### SEC-011: Cross-Origin Manifest Loading Warning
- **Severity:** Low
- **OWASP Category:** A05:2021-Security Misconfiguration
- **Location:** Web App Manifest at `cdn140.picsart.com/69624423237702047608.json`
- **Description:** The web app manifest is loaded from a CDN origin different from the page origin, causing browser warnings: "Manifest: property 'start_url' ignored, should be same origin as document."
- **Impact:** Minor — broken PWA functionality. Could indicate CDN misconfiguration affecting integrity controls.
- **Remediation:** Serve manifest from same origin or configure start_url correctly.

---

### SEC-012: CDN Assets Cached with Long TTL (Privacy Concern)
- **Severity:** Low
- **OWASP Category:** A04:2021-Insecure Design
- **Location:** `cdn-cms-uploads.picsart.com`
- **Description:** CDN assets are served with `cache-control: public, max-age=2592000` (30 days). If AI-generated persona images are served from this CDN, they'll be cached in proxies and CDN edges for 30 days, making it impossible for users to delete their AI-generated content.
- **Impact:** Users cannot exercise their "right to be forgotten" for AI-generated persona images cached across CDN nodes.
- **Remediation:**
  - Use shorter cache TTL for user-generated/AI-generated content
  - Implement cache purge mechanism for content deletion requests
  - Add `Cache-Control: private` for user-specific content

---

### SEC-013: Session/Auth Cookie Without SameSite Attribute
- **Severity:** Low
- **OWASP Category:** A02:2021-Cryptographic Failures
- **Location:** `authState` cookie, various session cookies
- **Description:** The `authState` and other session-related cookies don't explicitly set the `SameSite` attribute. While modern browsers default to `Lax`, explicit configuration is a security best practice.
- **Impact:** Potential for CSRF attacks on older browsers that default to `SameSite=None`.
- **Remediation:** Explicitly set `SameSite=Lax` or `SameSite=Strict` on all session cookies.

---

### SEC-014: Service Worker Registration (Information)
- **Severity:** Info
- **OWASP Category:** N/A
- **Location:** `https://picsart.com/sw.js`
- **Description:** A service worker is registered, which intercepts network requests. Multiple service worker instances were observed (6 active). Service workers persist across sessions and can cache/modify responses.
- **Impact:** Informational — service workers should be audited for proper cache invalidation and potential response manipulation.
- **Remediation:** Audit service worker for proper cache-busting, ensure it doesn't cache sensitive API responses.

---

### SEC-015: Exposed User Identifiers in Cookies
- **Severity:** Info
- **OWASP Category:** A01:2021-Broken Access Control
- **Location:** `gtm_user_id` cookie
- **Description:** The numeric user ID (`511638607014101`) is stored in a cookie named `gtm_user_id` accessible from JavaScript. This ID could potentially be used for IDOR attacks if API endpoints accept it as a parameter.
- **Impact:** Facilitates user enumeration and potential IDOR attacks on API endpoints.
- **Remediation:** Don't expose sequential/predictable user IDs in client-accessible storage.

---

### SEC-016: reCAPTCHA Token Stored in localStorage
- **Severity:** Info
- **OWASP Category:** A05:2021-Security Misconfiguration
- **Location:** `_grecaptcha` localStorage key
- **Description:** A Google reCAPTCHA token is persisted in localStorage. These tokens should be ephemeral and used once.
- **Impact:** Potential for reCAPTCHA token replay if not properly validated server-side.
- **Remediation:** Don't persist reCAPTCHA tokens in localStorage.

---

### SEC-017: PayPal Storage Data in localStorage
- **Severity:** Info
- **OWASP Category:** A04:2021-Insecure Design
- **Location:** `__paypal_storage__` localStorage key
- **Description:** PayPal SDK stores session GUIDs and funding data in localStorage, persisting across sessions.
- **Impact:** Reveals that PayPal integration is active; session data persists longer than necessary.
- **Remediation:** Clear PayPal storage data on logout.

---

### SEC-018: Internal Dev Console URL Disclosure
- **Severity:** Info
- **OWASP Category:** A05:2021-Security Misconfiguration
- **Location:** `dev.picsart.com`
- **Description:** `dev.picsart.com` redirects to `console.picsart.io:443`, exposing the internal developer console URL.
- **Impact:** Attackers know the internal dev/admin console location for targeted attacks.
- **Remediation:** Remove public DNS record for `dev.picsart.com` or restrict access.

---

## Scope Limitations

1. **Cross-origin iframe interaction:** The Persona miniapp runs in a cross-origin iframe (`miniapps-webapps.picsart.com`), which prevented direct DOM interaction for XSS testing of input fields. The iframe correctly blocks cross-origin JavaScript access.

2. **API interception:** Without man-in-the-middle proxy setup, individual API calls during persona generation couldn't be captured and replayed for IDOR/rate-limit testing. 

3. **Stored XSS:** Testing stored XSS in persona names/descriptions requires completing the wizard flow with injected payloads, which was limited by the cross-origin iframe restriction.

4. **Credit manipulation:** The "5 credits" indicator (dropped to "1" during testing) couldn't be directly manipulated without intercepting the miniapp's API calls to the backend.

## Recommendations Priority

| Priority | Finding | Effort |
|----------|---------|--------|
| **P0** | SEC-002: Fix CORS wildcard+credentials on CDN | Low |
| **P0** | SEC-001: Add security headers (CSP, HSTS, X-Frame-Options) | Medium |
| **P1** | SEC-003: Restrict API CORS to explicit allowlist | Medium |
| **P1** | SEC-004: Remove PII from localStorage | High |
| **P1** | SEC-009: Fix GDPR consent flow (data collected without consent) | High |
| **P2** | SEC-005: Sandbox miniapp iframe, reduce permissions | Low |
| **P2** | SEC-006: Add HttpOnly to sensitive cookies | Low |
| **P2** | SEC-007: Add clickjacking protection | Low |
| **P2** | SEC-008: Restrict infrastructure info disclosure | Medium |
| **P3** | SEC-010 through SEC-018: Address low/info findings | Various |

---

*Report generated by Sentinel Security QA — 2026-03-23*
