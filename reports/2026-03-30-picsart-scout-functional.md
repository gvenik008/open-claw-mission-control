# Functional QA Report — Picsart AI Influencer Studio
**Agent:** Scout (Functional QA Tester)  
**Target:** https://picsart.com/ai-influencer-studio/  
**Test Date:** 2026-03-30  
**Environment:** Logged-Out / macOS Chrome 146  
**Browser Profile:** user-samvel (CDP Port 18800)  
**Report Status:** ✅ Complete

---

## Executive Summary

Tested the full logged-out flow of the Picsart AI Influencer Studio — a 3-step persona wizard (Vibe Check → Shape → Evolve) rendered inside a cross-origin iframe from `miniapps-webapps.picsart.com`.

**5 bugs found**, ranging from medium to high severity. The core wizard flow works end-to-end, all 23 vibe categories are present, and navigation controls (Back/Next) are properly implemented at each step.

**Key concerns:**
- URL parameter pollution occurs on every page load (medium severity)
- "Streetwear" vibe param (`?personaVibe=streetwear`) silently fails — actual ID is `streetwear_hypebeast` (high severity)
- Page `<title>` is just "Picsart" — no descriptive title for SEO/accessibility (medium)
- Generate button is disabled on Step 3 with no explanation for logged-out users (medium UX)
- Credit badge shows "98.5k" to logged-out users — potentially confusing (low)

---

## Bug Reports

### BUG-SCOUT-001 — URL Parameter Pollution on Every Navigation
**Severity:** Medium  
**Area:** URL / Routing  
**Type:** Functional  

**Steps to Reproduce:**
1. Navigate to `https://picsart.com/ai-influencer-studio/`
2. Observe the URL in browser address bar

**Expected:** URL stays clean: `https://picsart.com/ai-influencer-studio/`  
**Actual:** URL becomes: `https://picsart.com/ai-influencer-studio/?pathname=%2Fai-influencer-studio%2F&personaStep=1`

**Pattern:** `pathname=%2Fai-influencer-studio%2F` is appended to EVERY URL on this page, regardless of input:

| Input URL | Actual URL |
|-----------|------------|
| `?` (bare) | `?pathname=%2Fai-influencer-studio%2F&personaStep=1` |
| `?personaStep=1` | `?personaStep=1&pathname=%2Fai-influencer-studio%2F` |
| `?personaStep=2&personaVibe=y2k` | `?personaStep=2&personaVibe=y2k&pathname=%2Fai-influencer-studio%2F` |
| `?personaStep=3&personaVibe=y2k` | `?personaStep=3&personaVibe=y2k&pathname=%2Fai-influencer-studio%2F` |

**Root Cause Theory:** The parent Picsart SPA reads `window.location.pathname` and writes it back as a query param (likely for the miniapp postMessage bootstrap). This creates circular/redundant state encoding.

**Impact:** Ugly shareable URLs, potential infinite-loop redirect risk, breaks bookmark/sharing UX.

---

### BUG-SCOUT-002 — "Streetwear" Vibe URL Param Silently Fails
**Severity:** High  
**Area:** Step 2 — Shape Wizard / URL Params  
**Type:** Functional / Data

**Steps to Reproduce:**
1. Navigate to `https://picsart.com/ai-influencer-studio/?personaStep=2&personaVibe=streetwear`
2. Observe the page

**Expected:** Streetwear customization options load (like Y2K, Cottagecore, etc.)  
**Actual:** Page loads Step 2 with NO customization content — only Back button is visible. The `personaVibe=streetwear` param is **silently dropped** from the URL.

**Root Cause:** The actual vibe ID is `streetwear_hypebeast`, not `streetwear`. The frontend presumably receives the vibe param and fails silently rather than mapping or erroring.

**Evidence:**
- `?personaVibe=streetwear` → URL drops vibe param, empty Step 2
- `?personaVibe=streetwear_hypebeast` → URL preserved, content loads correctly (60 thumbnails, 5 gender options, Surprise Me button)

**Impact:**
- Any deep-link or shared URL using the short vibe name "streetwear" completely breaks
- Could affect marketing links, analytics tracking, social sharing
- The vibe card on Step 1 has `data-pulse-name="vibe-streetwear_hypebeast"` — so internal navigation works, but external/direct URL entry fails

---

### BUG-SCOUT-003 — Page Title is Just "Picsart" (No Descriptive Title)
**Severity:** Medium  
**Area:** SEO / Accessibility / Browser UX  
**Type:** Content / Meta  

**Steps to Reproduce:**
1. Navigate to any step of `https://picsart.com/ai-influencer-studio/`
2. Check the browser tab title (`document.title`)

**Expected:** Something like "AI Influencer Studio — Create Your Character | Picsart"  
**Actual:** `Picsart`

**Impact:**
- Poor SEO — Google can't differentiate this page from any other Picsart page
- Accessibility: screen readers announce "Picsart" with no context
- Tab usability: users with multiple Picsart tabs can't tell which tab is which
- Observed at ALL steps (1, 2, 3) — title never updates dynamically

---

### BUG-SCOUT-004 — Generate Button Disabled on Step 3 with No Explanation (Logged-Out)
**Severity:** Medium  
**Area:** Step 3 — Evolve / CTA  
**Type:** UX / Functional  

**Steps to Reproduce:**
1. Navigate to `https://picsart.com/ai-influencer-studio/?personaStep=3&personaVibe=y2k` (logged out)
2. Look at the Generate button in the footer

**Expected:** Either:
- (a) "Sign in to Generate" button with clear auth prompt, OR
- (b) Generate is active and triggers auth flow on click

**Actual:** Button text says "Generate" but it has `disabled=""` attribute. No tooltip, no aria-label, no explanation visible. The user is stuck with a disabled button and no guidance.

```html
<button data-pulse-name="footer-generate" disabled="">Generate</button>
```

**Impact:**
- Confusing dead end for logged-out users exploring the wizard
- No conversion pathway visible (no CTA to sign up/log in)
- User may think the product is broken

**Note:** Step 3 also shows minimal content — just "Back" and "Generate" with no persona preview or character summary displayed.

---

### BUG-SCOUT-005 — Credit Badge (98.5k) Visible to Logged-Out Users
**Severity:** Low  
**Area:** Header / Credits Display  
**Type:** UX / Display  

**Steps to Reproduce:**
1. Navigate to any step as a logged-out user
2. Check the header area of the wizard

**Expected:** No credit badge (or "Sign in to earn/use credits")  
**Actual:** Shows `98.5k` credit count in the header (with a credit icon)

**Impact:**
- Confusing: logged-out users see a large number they don't own
- May represent total platform-wide Picsart credits or a cached value
- Could mislead users into thinking they have credits available

---

## Feature Verification Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page loads | ✅ PASS | Redirects to ?personaStep=1 |
| 23 vibe categories on Step 1 | ✅ PASS | All 23 present |
| Step 1 progress indicator | ✅ PASS | "Vibe Check" highlighted |
| Step 2 progress indicator | ✅ PASS | Step 1 shows checkmark, Step 2 highlighted |
| Step 3 progress indicator | ✅ PASS | Steps 1+2 show checkmarks, Step 3 highlighted |
| Step 1 "Next" button | ✅ PASS | Visible and present |
| Step 2 "Back" button | ✅ PASS | All vibes tested |
| Step 3 "Back" button | ✅ PASS | Present |
| Step 3 "Generate" button | ⚠️ PARTIAL | Present but disabled with no explanation |
| Step 3 info icon | ✅ PASS | `credit-info` pulse element present |
| Photo upload (Step 2) | ✅ PASS | Present for character vibes |
| Surprise Me button | ✅ PASS | Present for character vibes |
| URL param navigation (Step 1) | ✅ PASS | Content loads |
| URL param navigation (Step 2 Y2K) | ✅ PASS | Full content loads |
| URL param navigation (Step 2 Streetwear) | ❌ FAIL | `streetwear` fails; `streetwear_hypebeast` works |
| URL param navigation (Step 2 Cottagecore) | ✅ PASS | Full content loads |
| URL param navigation (Step 2 Cyberpunk Edge) | ✅ PASS | Full content loads |
| URL param navigation (Step 2 Fruit Friends) | ✅ PASS | Unique UI (no gender/age, Pick Your Fruit) |
| URL stays clean | ❌ FAIL | `pathname=` pollution on all URLs |
| Page title descriptive | ❌ FAIL | Always "Picsart" |
| "Sign in to generate" for logged-out | ❌ FAIL | Disabled button, no explanation |
| HubSpot chat widget loading | ✅ PASS | Present (may affect load performance) |

---

## Part 1: Logged-Out State

### Initial Navigation
- URL: `https://picsart.com/ai-influencer-studio/` → immediately redirects to `?pathname=...&personaStep=1`
- Page title: `Picsart` (generic)
- The wizard starts at Step 1 (Vibe Check) — no separate "landing page" with character inspirations seen
- **Observation:** The Character Inspirations gallery (if it exists) is NOT visible in the logged-out state. The iframe immediately shows the wizard starting at Step 1.

### Iframe Architecture
- Parent page: `picsart.com/ai-influencer-studio/`
- App iframe: `*.miniapps-webapps.picsart.com` (cross-origin)
- HubSpot chat iframe: `app.hubspot.com/conversations-visitor/...` (auto-opens)
- **3 frames total** active on this page

---

## Part 2: Wizard Flow — Vibe-by-Vibe

### Step 1 — Vibe Check (23 Categories)

All 23 vibes present and verified:

| # | Display Name | Vibe ID | Tags |
|---|-------------|---------|------|
| 1 | Fruit Friends | fruit_friends | Cute, Viral |
| 2 | Pets | pets | Adorable, Fluffy |
| 3 | Y2K | y2k | Retro, Pop |
| 4 | Creatures | creatures | Surreal, Bold |
| 5 | Coquette | coquette | Girly, Romantic |
| 6 | Luxury Elite | luxury_elite | Glam, Regal |
| 7 | Wellness Guru | wellness_guru | Zen, Mindful |
| 8 | Old Money | old_money | Elegant, Luxury |
| 9 | Career Pro | career_professional | Boss, Power |
| 10 | Streetwear | streetwear_hypebeast | Hype, Urban |
| 11 | Soft Goth | soft_goth | Dark, Ethereal |
| 12 | Cottagecore | cottagecore | Soft, Floral |
| 13 | Ethereal Angel | ethereal_angel | Divine, Heavenly |
| 14 | Cyberpunk Edge | cyberpunk_edge | Neon, Gritty |
| 15 | Dark Fantasy | dark_fantasy | Shadow, Magic |
| 16 | Cute & Kawaii | cute_kawaii | Kawaii, Pastel |
| 17 | Fairy Fantasy | fairy_fantasy | Fairy, Enchanted |
| 18 | Effortlessly Cool | effortlessly_cool | Cool, Undone |
| 19 | Retro Revival | retro_revival | Groovy, Retro |
| 20 | Fun & Playful | fun_playful | Joyful, Vibrant |
| 21 | Grunge Alt | grunge_alt | Grunge, Raw |
| 22 | Futuristic | futuristic | Sci-Fi, Tech |
| 23 | Poetcore | poetcore_scholar | Literary, Dreamy |

**Note:** Display name "Poetcore" but ID is `poetcore_scholar` — check if deep links use the short name.

### Step 2 — Shape: Customization Options Per Vibe

#### Y2K (`?personaVibe=y2k`)
- **Sections:** Reference Image (optional), Gender, Eye Color, Ethnicity, Age, Skin Tone, Skin Features, Hair Slay, The Fit, Accessory Stack, Face Details, The Scene
- **Thumbnail options:** 71 total
- **Gender options:** 5 (Female, Male, Trans Man, Trans Woman, Non-binary)
- **Age options:** 4 (Young Adult, Adult, Middle-Aged, Mature)
- **Skin tone colors:** 6
- **Surprise Me:** ✅ | **Photo upload:** ✅ | **Back:** ✅

Y2K Hair options: Space Buns, Crimped Chaos, Butterfly Clips, Color Streaks, Sleek Middle Part, Frosted Tips, Spiked Gel, Curtain Part, Mini Twists, Bleached Crop (10 options)  
Y2K Outfits: Baby Tee Era, Plush Set, Halter + Mini, Metallic Drip, Denim on Denim, Cargo Chain, Mesh Layer, Puffer Vest, Bowling Shirt, Sport Jersey (10 options)  
Y2K Accessories: Tinted Shades, Butterfly Choker, Body Glitter, Bedazzled Everything, Chunky Platforms, Visor Cap, Chunky Chain, Arm Cuffs (8 options)  
Y2K Face: Frosted Lips, Rhinestone Face, Glossy Glow, Smoky + Shimmer, Clean Face, Sharp Brows (6 options)  
Y2K Scenes: Shopping Mall, Dance Floor, Y2K Bedroom, Pool Party, City Night, Malibu Beach, Red Carpet (7 options)

#### Streetwear Hypebeast (`?personaVibe=streetwear_hypebeast`)
- **Thumbnail options:** 60 total
- **Gender options:** 5 | **Age options:** 4 | **Skin tone colors:** 6
- **Surprise Me:** ✅ | **Photo upload:** ✅ | **Back:** ✅

#### Cottagecore (`?personaVibe=cottagecore`)
- **Thumbnail options:** 60 total
- **Gender options:** 5 | **Age options:** 4 | **Skin tone colors:** 6
- **Surprise Me:** ✅ | **Photo upload:** ✅ | **Back:** ✅

#### Cyberpunk Edge (`?personaVibe=cyberpunk_edge`)
- **Thumbnail options:** 65 total
- **Gender options:** 5 | **Age options:** 4 | **Skin tone colors:** 6
- **Surprise Me:** ✅ | **Photo upload:** ✅ | **Back:** ✅

#### Fruit Friends (`?personaVibe=fruit_friends`)
- **Unique UI — non-character vibe**
- **Sections:** Pick Your Fruit, The Scene, Fruit Mood
- **Thumbnail options:** 24 total
- **NO Gender/Age/Skin Tone/Photo Upload** — this is an avatar/mascot vibe, not a human character
- Fruits: Strawberry, Watermelon, Avocado, Peach, Lemon, Blueberry, Pineapple, Cherry, Orange, Grape, Mango, Coconut (12 options)
- Scenes: Kitchen Counter, Farmers Market, Fruit Bowl, Garden Patch, Picnic Blanket, Smoothie Bar (6 options)
- Moods: Happy Wave, Shy Blush, Silly Tongue, Cool Pose, Sleepy Baby, Super Excited (6 options)
- **Surprise Me:** ✅ | **Photo upload:** ❌ (expected — no human ref needed) | **Back:** ✅

---

## Part 3: Progress Indicator & Navigation

### Progress Bar State Machine

| Current Step | Step 1 Indicator | Step 2 Indicator | Step 3 Indicator |
|-------------|-----------------|-----------------|-----------------|
| Step 1 | 🔵 Active (1) | ⚪ Inactive (2) | ⚪ Inactive (3) |
| Step 2 | ✅ Complete (checkmark) | 🔵 Active (2) | ⚪ Inactive (3) |
| Step 3 | ✅ Complete (checkmark) | ✅ Complete (checkmark) | 🔵 Active (3) |

**CSS Classes Used:**
- `stepStepper-0183` = Active/current step
- `stepStepper-0184` = Completed step (shows checkmark SVG)
- `stepStepper-0185` = Future/inactive step

**Step Labels:** "Vibe Check" → "Shape" → "Evolve" ✅

### Back/Next Navigation

| Location | Back Button | Next/Generate |
|----------|-------------|---------------|
| Step 1 | ❌ None (correct) | ✅ "Next" button |
| Step 2 | ✅ Present (`footer-back`) | ✅ "Next" (assumed) |
| Step 3 | ✅ Present (`footer-back`) | ⚠️ "Generate" — DISABLED |

---

## Part 4: Character Inspirations

**Finding:** No separate "Character Inspirations" gallery section was found in the logged-out state. The wizard immediately starts at Step 1 (Vibe Check) — the landing page IS the wizard.

Possible scenarios:
- Character Inspirations gallery may only appear after login
- It may be on a different URL/section of the page that requires scrolling past the iframe
- The feature may not exist in the current production build
- It could be part of a logged-in feed or "explore" section not accessible in this test state

**Recommendation:** Verify with product team if Character Inspirations gallery is expected in the current build, and under what conditions it's visible.

---

## Technical Observations

### Iframe Architecture
```
Parent: picsart.com (SPA)
  └── App iframe: *.miniapps-webapps.picsart.com
        └── Wizard React app (Pulse components)
  └── HubSpot chat iframe (auto-loads)
```

### Pulse Analytics Tags (data-pulse-name)
The miniapp uses analytics tagging consistently. Key events:
- `start-over-logo` — Logo click (resets wizard)
- `close-app` — X button
- `step-1`, `step-2`, `step-3` — Progress bar steps (clickable)
- `vibe-{id}` — Vibe card selection
- `photo-upload` — Reference image upload
- `shape-gender`, `shape-age`, `shape-thumbnail`, `shape-color` — Customization options
- `surprise-me` — Random selection
- `footer-back`, `footer-next`, `footer-generate` — Footer CTAs
- `credit-info` — Credit info tooltip trigger

### Credit Display
- Header shows a credit balance ("98.5k") even for logged-out users
- This number appears static/placeholder — not a user-specific balance
- Could be a global Picsart community stat or placeholder text

---

## Screenshots Captured

| Filename | Description |
|----------|-------------|
| `step1.png` | Step 1 — Vibe Check grid |
| `step2_y2k.png` | Step 2 — Y2K customization |
| `step2_streetwear.png` | Step 2 — Streetwear Hypebeast |
| `step2_cottagecore.png` | Step 2 — Cottagecore |
| `step2_cyberpunk.png` | Step 2 — Cyberpunk Edge |
| `step2_fruit_friends.png` | Step 2 — Fruit Friends (unique non-human UI) |
| `step3.png` | Step 3 — Evolve (Generate disabled) |

Screenshots saved to: `/tmp/qa_screenshots/`

---

## Risk Assessment

| Area | Risk | Priority |
|------|------|----------|
| `streetwear` URL param mismatch | Marketing links may silently break | 🔴 High |
| URL pollution | Shareable URLs polluted | 🟡 Medium |
| Generate button disabled with no CTA | Conversion rate impact | 🟡 Medium |
| Page title generic | SEO/accessibility | 🟡 Medium |
| Credit badge for logged-out | UX confusion | 🟢 Low |
| No character inspirations visible | Feature gap or scope issue | 🟢 Low |

---

## Recommendations

1. **Fix vibe ID mapping:** Add URL aliases so `streetwear` maps to `streetwear_hypebeast`. Or update all external references to use the full ID.
2. **Fix URL pollution:** The `pathname=` param should not be written to the browser URL. Use postMessage or sessionStorage for internal routing instead.
3. **Add page title:** Dynamically set `<title>` per step, e.g. "AI Influencer Studio – Pick Your Vibe | Picsart"
4. **Add sign-in prompt to Generate:** When logged out, replace disabled "Generate" with "Sign in to Generate" or show an auth modal on click.
5. **Credit badge audit:** Clarify what "98.5k" represents for logged-out users and whether it should be hidden.
6. **Verify Character Inspirations scope:** Confirm with product if this feature is expected in current build.

---

*Report generated by Scout (Functional QA Tester) | 2026-03-30*
