# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Next.js version

This project runs **Next.js 16.2.6** with React 19. APIs, conventions, and file structure may differ from training data. Read `node_modules/next/dist/docs/` before writing any code involving routing, metadata, or server components. Heed deprecation notices.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build — run this before committing to catch errors
npm run lint     # eslint
```

There are no tests. `npm run build` is the verification step.

## Architecture

Single-user personal learning app. No auth, no database — all state lives in `localStorage`.

**Four pages:**
- `/` — Dashboard: streak, learned count, due count, word of the day
- `/flashcards` — SRS study session
- `/translate` — AI translation (calls `/api/translate`)
- `/radio` — 15-min daily listening timer + station links

**Key libraries:**
- `lib/srs.ts` — entire spaced-repetition engine (state machine + SM-2)
- `lib/radio.ts` — radio prefs persistence + notification helpers
- `data/words.json` — 500-word deck (hand-written, no API generation)
- `components/Nav.tsx` — sidebar (desktop) + bottom bar (mobile), client component

**SRS engine (`lib/srs.ts`):**

Cards move through three phases: `new → learning → review`. The learning phase uses four fixed steps: **6h → 1d → 1mo → 1yr**. Wrong answer at any step resets to 6h. After completing all steps, SM-2 takes over for long-term scheduling.

localStorage key: `kinya_srs_v2` (migrates from old `kinya_srs_state` key automatically).

Queue order: learning (most urgent) → review sorted by ease factor ascending (hardest first) → new cards. New cards are capped at 10/day and surface categories with the lowest average ease factor first.

**Translation API (`app/api/translate/route.ts`):**

POST endpoint, calls `claude-haiku-4-5-20251001` directly via `@anthropic-ai/sdk`. Requires `ANTHROPIC_API_KEY` env var. Returns `{ translation, romanization?, notes? }`.

**Styling:**

Tailwind v4 with CSS custom properties defined in `app/globals.css`. Use `var(--accent)`, `var(--surface)`, `var(--border)`, etc. directly in `style={{}}` props — do not add Tailwind color classes for brand colors. The palette is warm-dark (near-black with amber undertones).

## Deployment

Deployed on Vercel. `git push origin main` triggers auto-deploy. Custom domain: `kinya.loic-rutabana.com` (A record → 76.76.21.21 in Route 53).

`ANTHROPIC_API_KEY` is set in Vercel production environment variables.
