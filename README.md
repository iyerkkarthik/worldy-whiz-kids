# Worldy Whiz Kids – Vibe Coding Field Guide

This document is the source of truth for continuing development on **Worldy Whiz Kids**, a kid-friendly world geography explorer built with React, Vite, and Supabase. It captures the app's intent, architecture, data contracts, and UI patterns so you can drop into “vibe coding” mode with Codex (or any AI pair) without losing context.

---

## 1. Product Vision

* Audience: Curious kids (ages 7–12) learning about countries, capitals, and landmarks.
* Tone: Playful, encouraging, and bright. Emoji-forward copy is welcome when it reinforces delight.
* Core loops:
  1. **Explore continents ➜ browse countries ➜ read rich country cards ➜ take a quiz.**
  2. **Launch guided continent tours** with narrated slides that auto-advance.
  3. **Refresh data from Supabase Edge Functions** to keep content current.
* Accessibility: Speech synthesis is used to narrate headings, fun facts, and tour scripts. Every interactive feature needs to remain usable without audio (buttons, tooltips, progress bars already in place).

---

## 2. Tech Stack Snapshot

| Area | Details |
| --- | --- |
| Framework | Vite + React 18 + TypeScript |
| UI | Tailwind CSS with custom “kid” scales, shadcn/ui primitives under `@/components/ui` |
| State/data | Local component state + TanStack React Query (for Supabase calls) |
| Routing | `react-router-dom` with `/` (home) and `*` (404) |
| Backend | Supabase (Postgres tables + Edge Function `populate-countries`) |
| Audio | Browser Speech Synthesis API (no external dependency) |
| Tooling | ESLint (strict TS rules), Prettier via default formatting |

> **Heads-up:** `npm run lint` currently fails because of pre-existing TypeScript lint issues in legacy files. Do not block feature work on these unless your task requires touching those files.

---

## 3. Data Contracts

### 3.1 Supabase Tables

| Table | Key Columns | Notes |
| --- | --- | --- |
| `countries` | `id`, `country_name`, `iso2`, `continent`, `capital`, `population_millions`, `area_km2`, `currency`, `primary_language`, `capital_lat`, `capital_lon`, `flag_image_url` | 195 UN members + observers. `population_millions` stores population ÷ 1,000,000. Continent strings match UI copy (“North America”, “South America”). |
| `points_of_interest` | `id`, `iso2`, `name`, `poi_type`, `description`, `lat`, `lon`, `image_url` | Linked to `countries.iso2`. `poi_type` values are currently `landmark`, `mountain`, `forest` and map to icons in `CountryDetail` / `ContinentTour`. |

### 3.2 Derived Values

* `CountryBrowser` expects a `poi_count` property supplied by Supabase’s `points_of_interest(count)` join. The component flattens the response into `poi_count: number`.
* `QuizGenerator` consumes the raw `countries` table and builds multiple-choice questions. Ensure required columns (capital, continent, population, area, currency, primary_language) are present before generating quizzes.

---

## 4. Supabase Edge Function – `populate-countries`

* File: `supabase/functions/populate-countries/index.ts`
* Responsibilities:
  * Pull 195 countries from the REST Countries API.
  * Normalize the Americas into `North America` / `South America` using the `subregion` field.
  * Store capital coordinates, center coordinates, population (converted to millions), area, currency, language, and flag URLs.
  * Query Wikidata (SPARQL) for 3 categories of POIs per country (landmarks, highest points, forests/parks) and upsert into `points_of_interest`.
  * Convert Wikimedia `File:` URLs into direct image links via the `Special:FilePath` helper.
* Authentication: Uses the service role key set via environment variables when deployed to Supabase functions.
* Invocation paths:
  * `DataManager` button inside Advanced Settings (`AdvancedSettings` ➜ `DataManager` ➜ `handlePopulateData`).
  * `DataRepopulator` card (legacy admin surface, not currently rendered).

When extending the function, keep runtime under 120s. Break API calls into batched promises with retry/backoff (see existing `runSparqlQuery`).

---

## 5. Front-End View State

`src/pages/Index.tsx` orchestrates the entire experience through a discriminated union state machine:

```ts
{ type: "home" }
{ type: "browser"; continent: string | null }
{ type: "country"; country: Country }
{ type: "quiz"; country?: Country; continent?: string; isRandom?: boolean }
{ type: "tour"; continent: string }
```

Transitions:
1. **Home ➜ Browser** via `ContinentPicker` (`onContinentSelect`). Passing `null` shows all countries.
2. **Browser ➜ Country** via `onCountrySelect`.
3. **Country ➜ Quiz** via `onQuizStart(country)`.
4. **Home ➜ Quiz** via Continent quiz selector or “Random Quiz”.
5. **Home ➜ Tour** via “Tour” buttons on continents.
6. `handleBack` resets to home, `handleBackToBrowser` returns to the previously selected continent.
7. `handleQuizComplete` persists results to `localStorage` (`quiz-results`). Extend this array structure if adding badges or streaks.

---

## 6. Key Components & Contracts

### 6.1 `ContinentPicker`
* Props: `onContinentSelect`, `onContinentQuizStart`, `onRandomQuizStart`, `onTourStart`.
* Displays hero CTA, cards per continent (color-coded via Tailwind `bg-continent-*` utilities), quiz shortcuts.
* Stops event propagation on “Tour” button so card click still routes to continent browsing.

### 6.2 `CountryBrowser`
* Fetches every country (React Query integration is planned; currently uses Supabase client directly inside `useEffect`).
* Filters: search by country, capital, continent, POI presence, plus sort toggles (A–Z, population, area).
* Speech button narrates which continent is being explored.
* Each card exposes `country` object to the parent when clicked.
* TODO ideas: paginate for performance, migrate filters into URL query params, or adopt virtualization.

### 6.3 `CountryDetail`
* Loads POIs for the selected country.
* Provides hero section (flag, continent badge, quick stats).
* `funFacts` array fuels the “Hear Fun Facts” button via speech synthesis.
* Converts Wikimedia URLs to direct assets before rendering `<img>`.
* Offers CTA for the quiz with `onQuizStart(country)`.

### 6.4 `Quiz`
* Delegates question creation to `QuizGenerator` based on mode:
  * Random world quiz (`isRandom` true).
  * Country quiz (specific country passed).
  * Continent quiz (`continent` string).
* Auto-advances after each answer with a 3s delay, plays encouragement via speech.
* Renders final scorecard with celebratory copy and navigation back to home.
* Edge cases: shows loading card while generating, and “No questions available” fallback if generator returns an empty array.

### 6.5 `ContinentTour`
* Carousel-driven slideshow of every country in a continent.
* Pulls all countries + POIs up front, groups POIs by `iso2`.
* Narration pipeline flows through `useTourAudio`, honoring mute toggle and adjustable speed (0.5x–2x).
* Auto-advances when narration completes; on last slide shows “Tour Completed” toast.
* Settings drawer toggled by the gear icon; expand with additional controls as needed.

### 6.6 `AdvancedSettings`
* Floating button bottom-right.
* Wraps a dialog containing `DataManager` (counts + refresh button) and admin warning copy.
* To expose additional admin tools, add them inside the dialog body.

---

## 7. Styling & UX Conventions

* Tailwind theme introduces custom color tokens (`--africa`, `--asia`, etc.) and playful fonts (`text-kid-*`). Reuse these utilities for consistency.
* Buttons use custom variants (`hero`, `continent`, `audio`, `quiz`). Consult `@/components/ui/button.tsx` before adding new variants.
* Animations (bounce, wiggle, confetti) reinforce positive feedback loops; prefer them over abrupt transitions.
* Icons come from `lucide-react`. Align icon size with the corresponding button size (`size="icon-lg"`, etc.).
* All images should handle `onError` gracefully by falling back to emoji or solid color blocks (see existing patterns in `CountryBrowser` and `CountryDetail`).

---

## 8. Audio & Accessibility Patterns

* Use `speechSynthesis` APIs defensively (`'speechSynthesis' in window` checks). Cancel any existing speech before starting new narration.
* Keep narration friendly and concise. Avoid reading raw numbers without formatting (`formatNumber` helpers already exist).
* Always provide a visual alternative (badge, toast, text) for information spoken aloud.
* `useTourAudio` exposes `startNarration`, `queueNarration`, `stopNarration`, `pauseNarration`, and `resumeNarration`. Hook into these if you build new guided flows.

---

## 9. Quiz Generation Logic

`src/utils/QuizGenerator.ts` stores weighted templates:
* **Country mode**: Capital, continent, area comparisons, language, currency, population, true/false prompts.
* **Continent mode**: Identify member countries, recall capitals, count countries loaded.
* **Random mode**: Delegates to country templates with random country seeds.

When adding templates:
1. Define `template`, `weight`, `category`, `difficulty`.
2. Use friendly decoy options (“Ice Cream City”, “Dragon Land”) that keep the tone light.
3. Provide encouraging explanations; they are read aloud during feedback.
4. Guarantee the correct answer is index `0` before shuffling (current logic expects that). If you randomize options, update `handleAnswerSelect` accordingly.

---

## 10. Data Refresh & Admin Tools

* **Advanced Settings** (floating button) ➜ **DataManager**: shows row counts and invokes `populate-countries`.
* **DataRepopulator** (unused component) offers a simplified call to the same function—embed it if you need a standalone admin page.
* Toast feedback is handled through `useToast` (shadcn pattern). Always supply both success and error copy.

---

## 11. Local Development Workflow

1. `npm install`
2. Copy `.env.example` ➜ `.env.local`, populate Supabase URL and anon key.
3. `npm run dev` (default port 5173).
4. Optional: `npm run lint` (currently reports legacy lint issues, see note above).
5. Tests are not configured; rely on manual QA + TypeScript.

Supabase setup:
* Run `supabase start` if developing against the local Supabase stack.
* Apply migrations under `supabase/migrations` (they build the `countries` and `points_of_interest` schema).
* Deploy functions via `supabase functions deploy populate-countries`.

---

## 12. Extension Ideas (for future vibe sessions)

* Badge system using quiz history stored in `localStorage`.
* Leaderboard backed by Supabase row-level security (RLS) policies for kid accounts.
* Map view leveraging Leaflet or Mapbox, seeded with `capital_lat` / `capital_lon`.
* Offline-ready PWA shell for classrooms with limited connectivity.
* Localization of UI strings plus speech voices per language.

Keep features scoped and delightful. Favor progressive disclosure over cramming everything onto one screen.

---

## 13. Collaboration Tips for Codex / AI Pairing

* Always restate the current view-state contract when generating code so Codex respects the discriminated union.
* Ask Codex to mirror existing speech-synthesis guards and animation classes.
* When modifying data-fetching hooks, migrate to React Query for caching instead of ad-hoc `useEffect` calls.
* Use the documented component props as strict contracts; update this guide if signatures change.
* Commit frequently and describe the user-facing behavior (“Add narration toggle to ContinentTour”), not the implementation details.

Happy world-building! 🌍✨
