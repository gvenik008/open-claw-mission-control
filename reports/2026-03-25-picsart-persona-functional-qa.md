# Picsart AI Influencer Studio — Functional QA Report
**Date:** 2026-03-25
**Tester:** Scout (Functional QA)
**Target:** https://picsart.com/ai-influencer-studio/
**Status:** 🔄 In Progress — Phase 2: Pro User Happy Path

---

## Executive Summary
*(To be completed at end)*
- Total bugs found: TBD (at least 5 confirmed so far)
- Critical: TBD | High: TBD | Medium: TBD | Low: TBD

---

## Architecture Notes (Critical Context)
- The AI Influencer Studio is embedded as a full-viewport iframe from `miniapps-webapps.picsart.com`
- The parent page is `picsart.com/ai-influencer-studio/`
- The iframe is cross-origin (blocked JavaScript access from parent)
- Authentication is handled by `picsart.com` and passed to the iframe via token/message
- URL parameters like `personaStep`, `personaVibe`, `personaCharId` are updated in parent URL to reflect wizard state

---

## Phase 1: Logged-Out State Testing

### Landing Page UI/UX
- **Page loads successfully** at https://picsart.com/ai-influencer-studio/
- Page title: "Picsart" (generic - not "AI Influencer Studio" specific)
- The entire app content is inside an iframe — page-level HTML is minimal
- The iframe fills 100% viewport (1200×869px during test)

### Landing Page Content (Logged-Out)
After navigating to `/logout` then back to `/ai-influencer-studio/`:
- **Greeting**: "Welcome back" (generic, no username) — NOT a proper logged-out state
- **[BUG-001]** After logout, the studio shows "Welcome back" with **1 previously-created persona still visible** (Atlas). Expected: No personas, or login prompt.
- **[BUG-001]** User's persona data persists visually in the iframe even after logout
- No credit count or account info visible
- "Create New" button is accessible
- "Close app" (X) button visible in top right
- Character Inspirations section visible with sample characters

### Vibe Check Step — Logged Out Access
- **Wizard is accessible without login** ✅
- Clicking "Create New" enters Step 1 (Vibe Check) without requiring authentication
- All 23 aesthetic categories are visible and browsable
- **[OBSERVATION]** No login prompt shown when accessing wizard without account

### CTA / Navigation
- "Create New" → Opens Step 1 Vibe Check ✅
- Character Inspirations → Shows sample character gallery ✅
- No explicit "Login" or "Sign Up" CTA visible within the studio UI
- Login flow is triggered via the parent picsart.com navigation

### Login Flow Testing
- **[BUG-002]** `https://picsart.com/login?redirectUrl=/ai-influencer-studio/` → Shows 404 "This canvas is blank" error. redirectUrl param not supported.
- **[BUG-002]** `https://picsart.com/login/` → Also shows 404 "This canvas is blank" error
- Login is a **modal overlay** triggered by clicking "Log in" button in picsart.com header
- Login options: Google, Facebook, Apple, Continue with email ✅
- Email flow: Enter email → Password → Log in ✅
- **Post-login redirect**: After login, user stays on `/not-found` page (no automatic redirect back to studio)
  - **[BUG-003]** Login from studio does NOT redirect back to AI Influencer Studio automatically — user must manually navigate back
- "Jump back in" feature: Shows previous account as quick-login option ✅

---

## Phase 2: Wizard Flow Testing (Happy Path — Pro User)

### Account State
- **Account**: Pro User (picsart@prouser.com)
- **Username displayed**: `userhcwczmv1` (auto-generated, not meaningful)
  - **[BUG-004]** Username display is an auto-generated hash instead of a recognizable name
- **Credits**: 450 shown in top-right corner ✅
- **Personas on load**: 4 personas (Sage, Ember, Phoenix, Nova)
- **Character Inspirations**: Axis, Mochi, Nova, Biscuit, Tropica (and more)

### Step 1: Vibe Check
- **Header**: "Pick your style"
- **All 23 categories verified** ✅:
  1. Fruit Friends — "Cute, viral, juicy" [CUTE] [VIRAL]
  2. Pets — "Fluffy, cute, iconic" [ADORABLE] [FLUFFY] — NEW badge
  3. Y2K — "Futuristic, shiny, bold" [RETRO] [POP] — TRENDING (🔥 badge)
  4. Creatures — "Surreal, wild, iconic" [SURREAL] [BOLD]
  5. Coquette — "Feminine, bows, pink" [GIRLY] [ROMANTIC]
  6. Luxury Elite — "Glamorous, opulent, regal" [GLAM] [REGAL]
  7. Wellness Guru — "Mindful, glowing, balanced" [ZEN] [MINDFUL]
  8. Old Money — "Luxury, classic, refined" [ELEGANT] [LUXURY]
  9. Career Pro — "Polished, powerful, ambitious" [BOSS] [POWER]
  10. Streetwear — "Bold, hype, urban" [HYPE] [URBAN]
  11. Soft Goth — "Dark, romantic, ethereal" [DARK] [ETHEREAL]
  12. Cottagecore — "Rustic, dreamy, nature" [SOFT] [FLORAL]
  13. Ethereal Angel — "Heavenly, radiant, divine" [DIVINE] [HEAVENLY] — NEW badge
  14. Cyberpunk Edge — "Neon, gritty, augmented" [NEON] [GRITTY] — NEW badge
  15. Dark Fantasy — "Mystical, shadowy, powerful" [SHADOW] [MAGIC] — NEW badge
  16. Cute & Kawaii — "Pastel, adorable, sweet" [KAWAII] [PASTEL]
  17. Fairy Fantasy — "Enchanted, whimsical, magical" [FAIRY] [ENCHANTED] — NEW badge
  18. Effortlessly Cool — "Messy, cool, undone" [COOL] [UNDONE]
  19. Retro Revival — "Vintage, groovy, throwback" [GROOVY] [RETRO]
  20. Fun & Playful — "Bright, joyful, energetic" [JOYFUL] [VIBRANT]
  21. Grunge Alt — "Raw, rebellious, authentic" [GRUNGE] [RAW]
  22. Futuristic — "Sleek, tech, visionary" [SCI-FI] [TECH]
  23. Poetcore — "Literary, dreamy, thoughtful" [LITERARY] [DREAMY]

- **Selection behavior**: Click to select shows pink border + checkmark ✅
- **Deselection**: Not yet tested (click again to deselect)
- **Next button disabled** until at least one category selected ✅
- **Next button enabled** after selection ✅
- **Progress bar**: Shows 3 steps — "Vibe Check → Shape → Evolve" — **NO "Share" step shown**
  - **[OBSERVATION]** Progress indicator shows only 3 steps, but share/download functionality may be part of the Evolve step or accessible post-generation

### Step 2: Shape (Vibe-Specific)
- Step 2 is **vibe-specific** — content changes based on Step 1 selection
- Example for "Fruit Friends" vibe:
  - **Heading**: "Who is your Fruit Friends character?"
  - **Pick Your Fruit**: Strawberry, Watermelon, Avocado, Peach, Lemon, Blueberry, Pineapple, Cherry, Orange, Grape, Mango, Coconut (12 options)
  - **The Scene**: Kitchen Counter, Farmers Market, Fruit Bowl, Picnic Blanket, Smoothie Bar + "Surprise Me" button
  - **Fruit Mood** section (partially visible, needs scrolling)
- URL reflects state: `personaVibe=fruit_friends` ✅

---

## Phase 3: Account-Specific Testing

*(Testing with each account type — results to be filled as testing progresses)*

### Pro User (picsart@prouser.com)
- ✅ Login successful
- ✅ Credits: 450 displayed in top-right
- ✅ Personas from account loaded (4 personas: Sage, Ember, Phoenix, Nova)
- ✅ Wizard accessible
- ⬜ Generation — not yet tested

### Free User
- ⬜ Not yet tested

### Free User — No Credits
- ⬜ Not yet tested

### Pro User — No Credits
- ⬜ Not yet tested

### Drive Full User
- ⬜ Not yet tested

### Expired User
- ⬜ Not yet tested

### Free→Pro Upgrade User
- ⬜ Not yet tested

### Ultra User
- ⬜ Not yet tested

---

## Bug Investigation: Persona Persistence
*(In progress)*

---

## Bug Investigation: Video Poster Outfit Change
*(Not yet started)*

---

## All Bugs (consolidated list so far)

| ID | Severity | Area | Title | Steps to Reproduce | Expected | Actual |
|----|----------|------|-------|-------------------|----------|--------|
| BUG-001 | Medium | Auth/State | Persona data persists after logout | 1. Login to studio, note personas 2. Navigate to /logout 3. Return to /ai-influencer-studio/ | Show logged-out state with no personal data | Shows "Welcome back" with 1 persona still visible (partial data) |
| BUG-002 | Low | Navigation | /login URL returns 404 | 1. Navigate to picsart.com/login/ or picsart.com/login?redirectUrl=... | Show login page/modal | 404 "This canvas is blank" error |
| BUG-003 | High | Auth Flow | No redirect back to studio after login | 1. Be on /ai-influencer-studio/ 2. Trigger login flow 3. Complete login | Redirect back to /ai-influencer-studio/ | User stays on /not-found, must manually navigate to studio |
| BUG-004 | Low | UX | Auto-generated username displayed | 1. Login with any test account 2. View greeting in studio | Show meaningful display name (email prefix or set name) | Shows hash-like auto-generated username "userhcwczmv1" |

---

## Missing Skills/Tools Identified
- Video playback testing tools (for BUG HUNT 2)
- Screenshot diff tools for visual regression
- Network interceptor for API call monitoring
- Ability to interact with cross-origin iframes (this browser tooling cannot execute JS in cross-origin iframes)

## Recommendations
*(To be completed at end of testing)*
