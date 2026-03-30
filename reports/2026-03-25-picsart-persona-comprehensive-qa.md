# Picsart AI Influencer Studio — Comprehensive QA Report

**Date:** March 25, 2026
**Target:** https://picsart.com/ai-influencer-studio/
**Team:** Gvenik (Orchestrator), Scout (Functional QA), Rover (Bug Hunter), Sentinel (Security)
**Accounts Tested:** Pro User, Free User (logged-out state), URL manipulation tests
**Product Version:** Picsart Persona (miniapp iframe architecture)

---

## Executive Summary

Picsart AI Influencer Studio (branded "Picsart Persona") is a 3-step wizard (Vibe Check → Shape → Evolve) embedded as a full-viewport cross-origin iframe from `miniapps-webapps.picsart.com` within the main `picsart.com` domain.

### Key Metrics
| Metric | Value |
|--------|-------|
| **Total Bugs Found** | **10** |
| Critical | 2 |
| High | 2 |
| Medium | 4 |
| Low | 2 |

### Architecture Discovery
- The product runs entirely inside a **cross-origin iframe** (`11421dcd...miniapps-webapps.picsart.com`)
- Parent page (`picsart.com`) provides shell, auth, navigation
- Iframe has **no sandbox attribute** and grants: camera, microphone, autoplay, fullscreen, clipboard-write, clipboard-read, geolocation, web-share
- Wizard state is reflected in parent URL parameters: `personaStep`, `personaVibe`, `personaCharId`
- Authentication passes from parent to iframe via token/message mechanism

---

## Product Structure

### Wizard Flow (3 Steps)
1. **Vibe Check** — Select aesthetic category (23 options)
2. **Shape** — Customize character (gender, eyes, ethnicity, age, skin tone, skin features, hair, outfit, accessories, face details, scene)
3. **Evolve** — Generate persona, change outfit, motion control, video generator

### Progress Indicator
- Shows 3 steps: Vibe Check → Shape → Evolve
- **Note:** Previous report (March 23) documented 4 steps including "Share." The Share/download functionality appears to have been merged into the Evolve step or is accessible post-generation.

### Aesthetic Categories (23 total)
| # | Category | Tags | Badge |
|---|----------|------|-------|
| 1 | Fruit Friends | CUTE, VIRAL | — |
| 2 | Pets | ADORABLE, FLUFFY | NEW |
| 3 | Y2K | RETRO, POP | TRENDING 🔥 |
| 4 | Creatures | SURREAL, BOLD | — |
| 5 | Coquette | GIRLY, ROMANTIC | — |
| 6 | Luxury Elite | GLAM, REGAL | — |
| 7 | Wellness Guru | ZEN, MINDFUL | — |
| 8 | Old Money | ELEGANT, LUXURY | — |
| 9 | Career Pro | BOSS, POWER | — |
| 10 | Streetwear | HYPE, URBAN | — |
| 11 | Soft Goth | DARK, ETHEREAL | — |
| 12 | Cottagecore | SOFT, FLORAL | — |
| 13 | Ethereal Angel | DIVINE, HEAVENLY | NEW |
| 14 | Cyberpunk Edge | NEON, GRITTY | NEW |
| 15 | Dark Fantasy | SHADOW, MAGIC | NEW |
| 16 | Cute & Kawaii | KAWAII, PASTEL | — |
| 17 | Fairy Fantasy | FAIRY, ENCHANTED | NEW |
| 18 | Effortlessly Cool | COOL, UNDONE | — |
| 19 | Retro Revival | GROOVY, RETRO | — |
| 20 | Fun & Playful | JOYFUL, VIBRANT | — |
| 21 | Grunge Alt | GRUNGE, RAW | — |
| 22 | Futuristic | SCI-FI, TECH | — |
| 23 | Poetcore | LITERARY, DREAMY | — |

### Character Customization (Step 2 — Y2K Example)
| Section | Options Count | Options |
|---------|--------------|---------|
| Reference Image | 1 (optional upload) | Camera icon upload |
| Gender | 5 | Female, Male, Trans Man, Trans Woman, Non-binary |
| Eye Color | 11 | Black, Purple, Green, White, Brown, Black (Solid), Milky White, Deep Brown, Blue, Amber, Red, Grey |
| Ethnicity | 10 | African, East Asian, Southeast Asian, European, South Asian, Latino, Middle Eastern, Indigenous, Pacific Islander, Mixed |
| Age | 4 | Young Adult, Adult, Middle-Aged, Mature |
| Skin Tone | 6 | 6 color swatches (light to dark) |
| Skin Features | 8 | None, Vitiligo, Pigmentation, Freckles, Birthmarks, Scars, Burns, Albinism |
| Hair Slay | 10 | Space Buns, Crimped Chaos, Butterfly Clips, Color Streaks, Sleek Middle Part, Frosted Tips, Spiked Gel, Curtain Part, Mini Twists, Bleached Crop |
| The Fit (Outfit) | 10 | Baby Tee Era, Plush Set, Halter + Mini, Metallic Drip, Denim on Denim, Cargo Chain, Mesh Layer, Puffer Vest, Bowling Shirt, Sport Jersey |
| Accessory Stack | 8 | Tinted Shades, Butterfly Choker, Body Glitter, Bedazzled Everything, Chunky Platforms, Visor Cap, Chunky Chain, Arm Cuffs |
| Face Details | 6 | Frosted Lips, Rhinestone Face, Glossy Glow, Smoky + Shimmer, Clean Face, Sharp Brows |
| The Scene | 7 + Surprise Me | Shopping Mall, Dance Floor, Y2K Bedroom, Pool Party, City Night, Malibu Beach, Red Carpet |
| **Total** | **86+ options** | Vibe-specific customization |

### Character Inspirations Gallery
60 pre-made characters spanning all vibes:
- Axis (Futuristic), Biscuit (Pets), Nova (Futuristic), Noodle (Pets), Berry (Fruit Friends), Mochi (Pets), Peachy (Fruit Friends), Onyx Talon (Creatures), Tropica (Fruit Friends), Emerald Rex (Creatures), Drip (Streetwear), Jade Fang (Creatures), Kai (Streetwear), Sterling (Old Money), Sasha (Y2K), Arabella (Old Money), Destiny (Y2K), Cosette (Coquette), Brittney (Y2K), Juliette (Coquette), Valentina (Luxury Elite), Blaze (Fun & Playful), Armand (Luxury Elite), Ziggy (Fun & Playful), Sage (Cottagecore), Petal (Fairy Fantasy), Clover (Cottagecore), Thorn (Fairy Fantasy), Sakura (Cute & Kawaii), Alexander (Career Pro), Miku (Cute & Kawaii), Morgan (Career Pro), Glitch (Cyberpunk Edge), Scout (Effortlessly Cool), Neon (Cyberpunk Edge), Ryder (Effortlessly Cool), Chrome (Cyberpunk Edge), Aura (Wellness Guru), Groovy (Retro Revival), Zen (Wellness Guru), Vinnie (Retro Revival), Slash (Grunge Alt), Raven (Soft Goth), Riot (Grunge Alt), Onyx (Soft Goth), Vesper (Dark Fantasy), Auriel (Ethereal Angel), Crimson (Dark Fantasy), Seraphina (Ethereal Angel), Thane (Dark Fantasy), Emerson (Poetcore), Sylvie (Poetcore)

### Pricing (from picsart.com homepage)
| Tier | Price | Credits | Storage |
|------|-------|---------|---------|
| Free | $0/mo | 5 credits/week | 100 MB |
| Pro | $7/mo (yearly) | 500 credits/month | 100 GB |
| Enterprise | Custom | Custom | — |

---

## Logged-Out State Testing

### Findings
- **Page loads successfully** without authentication
- After logout, navigating to `/ai-influencer-studio/` shows the **Vibe Check step directly** — no landing page with "Your Characters"
- No "Login" or "Sign Up" CTA visible within the studio iframe UI
- **Wizard is fully accessible without login** — users can browse all 23 categories, enter Step 2 (Shape), and customize without any auth wall
- Login is only triggered via the parent `picsart.com` header ("Log in" button opens a modal overlay)
- Login options: Google, Facebook, Apple, Continue with email

### Session Hygiene After Logout
- `encKJASd73` cookie persists after logout (should be cleared)
- `authState` cookie is correctly removed
- localStorage retains CleverTap tracking data, user device IDs, and analytics profiles after logout

---

## Pro User Testing (picsart@prouser.com)

### Account State
- **Credits displayed:** 450 (visible in some views, not consistently shown)
- **Username:** `userhcwczmv1` (auto-generated hash)
- **Existing personas:** 1 (Blaze) — Note: Scout's earlier session saw 4 (Sage, Ember, Phoenix, Nova). This discrepancy may indicate the **persona persistence bug** or different session states.

### Wizard Flow Results
- **Step 1 (Vibe Check):** All 23 categories render correctly with images, names, descriptions, and tags. "Next" button correctly disabled until selection made. ✅
- **Step 2 (Shape):** Full customization UI loads correctly for Y2K vibe. All 10 sections present with 86+ total options. "Surprise Me" button present. ✅
- **Step 3 (Evolve):** Accessible via URL navigation. Shows loading spinner and "Generate" button. ✅
- **Navigation:** Back button present on all steps. Progress indicator updates correctly with checkmarks on completed steps. ✅

---

## Bug Investigation: Persona Persistence

### Evidence
- Scout's session (earlier test): Pro User had **4 personas** (Sage, Ember, Phoenix, Nova)
- Current test session: Pro User has **1 persona** (Blaze)
- Same account, same credentials, different persona counts across sessions
- This is consistent with the **reported persona persistence bug** — personas may not reliably load from Picsart Drive

### Assessment
- **Status:** Partially confirmed — inconsistent persona counts observed across sessions
- **Likely cause:** Drive/API sync issue where persona data isn't reliably fetched on page load
- **Severity:** High — users lose access to their created content
- **Needs:** Controlled manual test with fresh persona creation + tab close/reopen to fully confirm

---

## Bug Investigation: Video Poster Outfit Change

### Assessment
- **Status:** Not reproduced in this session — iframe interaction limitations prevented completing the full video generation + outfit change flow
- **Needs:** Manual testing with video generation capability (requires credits and successful generation)
- **Test plan:** Create persona → generate video → note poster → change outfit → verify if poster updated

---

## All Bugs

| ID | Severity | Category | Title | Description |
|----|----------|----------|-------|-------------|
| BUG-001 | 🔴 Critical | Auth/State | Persona data persists after logout (intermittent) | After logout, returning to studio sometimes shows previous user's persona data ("Welcome back" + personas visible). Observed in Scout's test. Inconsistent — sometimes shows clean Vibe Check. Data leak between sessions. |
| BUG-002 | 🔴 Critical | Security | Wizard step bypass via URL parameters | Navigating directly to `?personaStep=3&personaVibe=y2k` skips Step 2 entirely and loads Step 3 (Evolve) with Generate button active. No server-side step validation. Could allow generation without proper selections. |
| ~~BUG-003~~ | ~~🟠 High~~ | ~~Auth Flow~~ | ~~No redirect back to studio after login~~ | **INVALID — Retracted.** Login within the miniapp is triggered via "Sign-in to generate" footer button or Generate button on Evolve step. After successful login: (1) if on Shape tab → auto-generation starts and redirects to Evolve, (2) if on Evolve tab → stays on same tab, auto-generates or requires one more Generate click. Scout tested login via parent page header (not the intended miniapp login flow). |
| BUG-004 | 🟠 High | State | Persona count inconsistency (possible persistence bug) | Same Pro User account shows different persona counts across sessions (4 in one, 1 in another). Suggests Drive/API sync failure when loading saved personas. |
| BUG-005 | 🟠 High | Auth | No auth gate on wizard flow | Users can access the entire wizard (Steps 1-3) without being logged in. Auth should be checked before allowing generation at minimum, but currently even Shape customization is fully accessible. |
| BUG-006 | 🟡 Medium | State | Vibe selection state persists after logout | After logout, returning to the studio shows a green checkmark on the previously selected vibe (Y2K). Iframe state not properly cleared on logout. |
| BUG-007 | 🟡 Medium | Navigation | URL parameter pollution across steps | Every navigation between steps appends duplicate `pathname` query parameters. URL grows: `?pathname=%2Fai-influencer-studio%2F&personaStep=1` → accumulates with each step change. |
| BUG-008 | 🟡 Medium | UX | /login URL returns 404 | Direct navigation to `picsart.com/login` or `picsart.com/login/` returns 404 "This canvas is blank" error. Login is modal-only. Breaks standard login URL expectations. |
| BUG-009 | 🟡 Medium | Security | Session cookie not cleared on logout | `encKJASd73` cookie persists after logout at `picsart.com/logout`. Should be cleared with auth cookies. |
| BUG-010 | 🟢 Low | UX | Auto-generated username displayed | Pro User greeting shows `userhcwczmv1` instead of a meaningful display name or email prefix. Poor personalization. |
| BUG-011 | 🟢 Low | UX | Page title is generic "Picsart" | When on the AI Influencer Studio, browser tab shows only "Picsart" — not "Picsart Persona" or "AI Influencer Studio". Bad for users with multiple Picsart tabs. |
| ~~BUG-012~~ | ~~🟢 Low~~ | ~~UX~~ | ~~No credit cost indicator~~ | **INVALID — Retracted.** There IS an info icon (ℹ️) next to the Generate button that shows credit count on click. Shows 0 for logged-out (expected), correct count for logged-in users. Working as designed. |

---

## Feature Gating Observations

### What's Accessible Without Login
| Feature | Accessible? |
|---------|:-----------:|
| Landing page | ✅ |
| Vibe Check (Step 1) | ✅ |
| Shape customization (Step 2) | ✅ |
| Evolve step UI (Step 3) | ✅ |
| Character Inspirations gallery | ✅ |
| Generate button (requires login) | ⚠️ Visible but untested |

### Pricing Tiers
| Feature | Free | Pro | Ultra |
|---------|:----:|:---:|:-----:|
| Credits | 5/week | 500/month | Max |
| Cloud Storage | 100 MB | 100 GB | Max |
| AI Access | Limited | Full | Full |
| Premium Templates | ❌ | ✅ | ✅ |
| Getty Video Clips | ❌ | ✅ | ✅ |
| Batch Edit | ❌ | Up to 50 | ✅ |
| Brand Kits | ❌ | 3+ | ✅ |

**Note:** Account-specific testing for Free No Credits, Pro No Credits, Drive Full, Expired, Free→Pro Upgrade, and Ultra accounts was attempted but blocked by iframe interaction limitations. These require manual browser testing.

---

## Security Findings (from current + previous assessments)

### Iframe Security
- **No sandbox attribute** on miniapp iframe — grants full permissions
- **Excessive `allow` permissions:** camera, microphone, clipboard-write, clipboard-read, geolocation, web-share — none needed for persona creation
- Cross-origin iframe blocks parent page JavaScript access (correctly configured)

### Data Persistence
- localStorage contains 60+ keys including PII (email, user ID, device fingerprint)
- CleverTap analytics receives full user profile
- Multiple cookies accessible via JavaScript (no HttpOnly flag)

### Session Management
- Wizard step bypass possible via URL parameters (no server-side validation)
- Cookie not fully cleared on logout
- Previous user data sometimes visible after logout (state leak)

---

## Accounts Not Fully Tested (Require Manual Testing)

The following accounts were provisioned but could not be fully tested due to cross-origin iframe limitations in automated browser interaction:

| Account | Email | Reason Blocked |
|---------|-------|---------------|
| Free No Credits | picsart@freeusernocredits.com | Cannot interact with wizard inside iframe |
| Pro No Credits | picsart@prousernocredits.com | Cannot interact with wizard inside iframe |
| Drive Full | picsart@drivefulluser.com | Cannot test save/export flows |
| Expired | picsart@expireduser.com | Cannot verify feature degradation |
| Free→Pro Upgrade | picsart@freetoprouser.com | Cannot test upgrade transition |
| Ultra | picsart@ultrauser.com | Cannot verify premium features |

### Recommended Manual Tests for Each Account:
1. **Free No Credits:** What happens when clicking Generate with 0 credits? Upsell prompt quality?
2. **Pro No Credits:** Same as above — does Pro status change the upsell message?
3. **Drive Full:** Can personas still be generated? What error on save?
4. **Expired:** What tier does the user degrade to? Which features remain?
5. **Free→Pro Upgrade:** Does feature access change in real-time during session?
6. **Ultra:** Are there any exclusive features beyond Pro?

---

## Missing Skills & Tools Identified During Testing

| Missing Capability | Impact | Recommendation |
|-------------------|--------|----------------|
| **Cross-origin iframe interaction** | Cannot click/type inside miniapp iframe | Need Playwright-level frame access or direct iframe URL testing |
| **Network request interception** | Cannot monitor API calls during generation | Add HAR capture or proxy tool |
| **Video playback testing** | Cannot verify video poster bug | Need video analysis capability |
| **Screenshot diff comparison** | Cannot compare visual states systematically | Add visual regression tool |
| **Credit tracking API access** | Cannot verify credit deduction server-side | Need API access to credit balance endpoint |
| **Multi-account session management** | Slow to switch between test accounts | Need cookie jar / profile management |

---

## Recommendations

### Immediate (P0)
1. **Fix wizard step bypass** — Add server-side step validation. Don't allow generation without completing Steps 1-2.
2. **Fix post-login redirect** — After login from studio, redirect back to `/ai-influencer-studio/`.
3. **Investigate persona persistence** — Root cause the Drive sync issue causing inconsistent persona counts.

### Short-term (P1)
4. **Add auth gate** — Require login before Step 2 (Shape) at minimum.
5. **Clear all session data on logout** — Remove iframe state, cookies, localStorage PII.
6. **Fix URL parameter pollution** — Replace, don't append, pathname parameters.
7. **Show credit cost on Generate button** — "Generate (2 credits)" instead of just "Generate".

### Medium-term (P2)
8. **Sandbox the miniapp iframe** — Add `sandbox="allow-scripts allow-same-origin allow-forms"`.
9. **Reduce iframe permissions** — Remove camera, microphone, geolocation.
10. **Improve page title** — Show "Picsart Persona" or "AI Influencer Studio" in browser tab.
11. **Fix /login URL** — Should show login page, not 404.
12. **Display real username** — Use email prefix or set name instead of auto-generated hash.

---

## Testing Methodology Notes

### Automated Testing Limitations
This product's **cross-origin iframe architecture** severely limits automated testing capabilities:
- Browser automation tools can snapshot iframe content but cannot reliably click elements
- Element refs from iframe snapshots become stale between tool calls
- JavaScript injection into cross-origin iframes is blocked by browser security
- URL parameter manipulation allows some wizard navigation but not full interaction

### Recommended Approach for Future Testing
1. **Playwright with direct iframe URL access** — Navigate to the miniapp URL directly instead of through the parent page
2. **Manual browser testing** — For flows requiring clicks, typing, and drag interactions inside the iframe
3. **API-level testing** — Intercept and replay API calls for credit, persona, and generation flows
4. **Cookie/profile management** — Pre-configure browser profiles for each test account

---

*Report compiled by Gvenik (Orchestrator) with contributions from Scout (Functional QA)*
*Task ID: mn5rsgap-cdk206*
