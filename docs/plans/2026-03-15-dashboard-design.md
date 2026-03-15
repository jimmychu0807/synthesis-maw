# Veil Dashboard — Design Document

## Overview

Next.js 15 dashboard for the Veil DeFi agent. Three tabbed screens: Configure (intent input), Audit (delegation report), Monitor (live dashboard). Modern dark finance aesthetic. Deploys to Vercel; proxies API calls to the agent server.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Audience | Judges + real users | Production-quality UX, not just a demo shell |
| Design style | Modern dark finance | Professional, Linear/Stripe dark mode aesthetic |
| Navigation | Tabbed single page | Auto-advances Configure > Audit > Monitor on deploy |
| Sponsor branding | Subtle contextual badges | "Powered by X" next to relevant sections, footer logos |
| Data refresh | Polling /api/state every 5s | Agent loop runs every 60s; polling is sufficient |
| Deployment | Full Next.js on Vercel | API routes proxy to agent server, no CORS needed |
| Styling | Tailwind CSS v4 | Fast iteration, design tokens via CSS custom properties |
| Charts | Recharts | Lightweight, React-native, good for allocation/donut charts |
| Testing | Playwright (e2e) + Vitest (hooks) + Storybook (visual) | Full coverage across interaction, logic, and visual layers |

## Architecture

### Stack

Next.js 15 (App Router), React 19, Tailwind CSS v4, Recharts, Playwright

### Monorepo

`apps/dashboard/` as pnpm workspace package `@veil/dashboard`.

### API Proxy

Dashboard never calls the agent server directly from the browser. Next.js API routes proxy requests server-side:

- `GET /api/state` -> forwards to `${AGENT_API_URL}/api/state`
- `POST /api/deploy` -> forwards to `${AGENT_API_URL}/api/deploy`

This avoids CORS and hides the agent server URL from the client.

Environment variables:
- `AGENT_API_URL` (server-side only) — agent server URL, defaults to `http://localhost:3147`
- `NEXT_PUBLIC_API_URL` not needed since we proxy through Next.js API routes

### Data Flow

```
Browser -> Next.js API route (Vercel / localhost:3000)
  -> Agent HTTP server (localhost:3147 or VPS)
    -> returns AgentState JSON
  <- proxied back to browser
```

### Polling

Client-side `useEffect` + `setInterval` every 5s hitting `/api/state`. Only active on the Monitor tab. Returns early if tab is not visible (Page Visibility API).

## Visual Design

### Color System

| Token | Value | Usage |
|-------|-------|-------|
| bg-primary | `#09090b` (zinc-950) | Page background |
| bg-surface | `#18181b` (zinc-900) | Card backgrounds |
| border | `#27272a` (zinc-800) | Card/divider borders |
| text-primary | `#fafafa` (zinc-50) | Headings, primary text |
| text-secondary | `#a1a1aa` (zinc-400) | Labels, secondary text |
| accent-positive | `#10b981` (emerald-500) | CTAs, positive states, within-threshold |
| accent-secondary | `#6366f1` (indigo-500) | Links, secondary actions |
| accent-danger | `#ef4444` (red-500) | Warnings, negative drift, errors |
| accent-warning | `#f59e0b` (amber-500) | Caution states, worst-case |

### Typography

- **Headings/body:** Inter (variable, loaded via `next/font`)
- **Numbers, addresses, code:** JetBrains Mono (loaded via `next/font`)
- Numbers use `tabular-nums` for column alignment

### Cards

Solid fill (`bg-surface`), 1px border (`border`), 8px border-radius. No drop shadows.

### Subtle Texture

Optional noise overlay on the page background for depth. CSS `background-image` with a tiny noise PNG or SVG filter.

## Screens

### Configure

Centered card layout, max-width ~640px.

1. **Wordmark:** "VEIL" in large type + "Intent-Compiled Private DeFi Agent" subtitle
2. **Intent textarea:** Large, with placeholder "60/40 ETH/USDC, $200/day, 7 days"
3. **Quick presets:** 3 pill buttons with example intents. Click fills the textarea.
   - "60/40 ETH/USDC, $200/day, 7 days"
   - "80/20 ETH/USDC, conservative, 30 days"
   - "50/50 split, $100/day, rebalance at 10% drift"
4. **Deploy button:** Full-width, emerald background. Disabled until text entered.
5. **Loading:** Button shows spinner + "Compiling intent via Venice AI..."
6. **Success:** Auto-switches to Audit tab with parsed intent data

### Audit

Two-column layout (desktop), stacked (mobile).

**Left column — Parsed Intent:**
- Horizontal stacked bar showing allocation percentages (colored per token)
- Key-value pairs: dailyBudget, timeWindow, maxSlippage, driftThreshold, maxTradesPerDay
- "Powered by Venice" sponsor badge

**Right column — Delegation Report:**
- ALLOWS section: green checkmark list from `audit.allows`
- PREVENTS section: red x-mark list from `audit.prevents`
- WORST CASE: amber warning box from `audit.worstCase`
- WARNINGS: orange list if adversarial warnings present
- "Enforced by MetaMask Delegation" sponsor badge

**Bottom:** Status bar — "Agent is now monitoring..." with link to Monitor tab

### Monitor

Dense grid layout with live data.

**Top stats row (4 cards, responsive 2x2 on mobile):**
- Portfolio Value (`$X,XXX.XX`)
- Current Drift (`X.X%` — emerald if within threshold, red if above)
- Trades Executed (count)
- Budget Spent (`$X.XX / $X,XXX max`)

**Middle row (2 columns, stacked on mobile):**
- **Allocation chart:** Donut or horizontal stacked bar, current vs target. Recharts.
- **AI Reasoning:** Latest reasoning from the agent log feed. Shows `shouldRebalance`, `reasoning`, `marketContext`. "Powered by Venice" badge.

**Bottom row (full width):**
- **Transaction table:** Columns: txHash (linked to etherscan), sellToken, buyToken, amount, status, timestamp. "Trades via Uniswap" badge.

**Status bar:** Green dot + "Cycle N", agent address (truncated), chain name.

## Error & Empty States

| State | Behavior |
|-------|----------|
| API unreachable | Monitor shows "Agent server offline" banner with retry. Stats show "--". |
| Deploy fails | Configure shows red error message below button. Button re-enables. |
| Invalid intent | 400 from server — inline error below textarea. |
| No trades yet | Table shows "No trades yet — agent is monitoring for drift" |
| Agent not running | Monitor shows "Agent not deployed" with link to Configure |
| Loading | Skeleton placeholders for cards and table rows |

## Sponsor Integration

Contextual badges, not a dedicated section:

| Sponsor | Where | Badge text |
|---------|-------|-----------|
| Venice | Configure (during compile), Audit (parsed intent), Monitor (AI reasoning) | "Powered by Venice" |
| MetaMask | Audit (delegation report) | "Enforced by MetaMask Delegation" |
| Uniswap | Monitor (transaction table) | "Trades via Uniswap" |
| Protocol Labs | Monitor (status bar or footer) | "Identity via ERC-8004" |

Footer bar with all sponsor logos at the bottom of every screen.

## Mobile

- Tab bar becomes horizontal scroll strip
- Stats row: 2x2 grid
- Two-column layouts stack vertically
- Transaction table becomes card list
- 44px minimum tap targets

## Testing

### Playwright E2E

- `dashboard.spec.ts` — full flow: load page > type intent > deploy > verify audit renders > verify monitor shows data
- `configure.spec.ts` — preset buttons fill textarea, deploy button states, error display
- `monitor.spec.ts` — polling shows updated data, transaction links work, empty states

### Vitest + React Testing Library

- `use-agent-state.test.ts` — polling interval, cleanup, error handling
- `use-deploy.test.ts` — submit intent, loading state, error state

### Storybook

Every UI component gets a `.stories.tsx` with states: default, loading, error, empty, populated. Run via `pnpm --filter @veil/dashboard storybook`.

## Impeccable Skills Plan

| Skill | When | Purpose |
|-------|------|---------|
| `teach-impeccable` | Before first component | Establish design context for Veil |
| `frontend-design` | Each screen component | Generate high-quality implementations |
| `polish` | After initial build | Fix alignment, spacing, consistency |
| `audit` | After polish | Accessibility, performance, responsive checks |
| `critique` | After audit | Evaluate design effectiveness |
| `adapt` | After critique | Verify mobile/responsive |
| `delight` | Final pass | Micro-interactions, transitions, number animations |

## File Structure

```
apps/dashboard/
  app/
    layout.tsx              Root layout, fonts, Tailwind, metadata
    page.tsx                Main page — tab state, renders active screen
    globals.css             Tailwind imports + custom properties
    api/
      state/route.ts        Proxy GET -> agent /api/state
      deploy/route.ts       Proxy POST -> agent /api/deploy
  components/
    tabs.tsx                Tab bar
    configure.tsx           Configure screen
    audit.tsx               Audit screen
    monitor.tsx             Monitor screen
    stats-card.tsx          Reusable stat card
    allocation-chart.tsx    Donut/bar chart (Recharts)
    tx-table.tsx            Transaction table
    sponsor-badge.tsx       "Powered by X" badge
    intent-bar.tsx          Horizontal allocation bar
    error-banner.tsx        API error display
    skeleton.tsx            Loading skeleton primitives
    toast.tsx               Notification toast
  hooks/
    use-agent-state.ts      Polling hook for /api/state
    use-deploy.ts           Mutation hook for /api/deploy
  lib/
    api.ts                  Fetch helpers
    types.ts                TypeScript types matching agent API response
  .storybook/
    main.ts
    preview.ts
  tests/
    dashboard.spec.ts       Full e2e flow
    configure.spec.ts       Configure screen tests
    monitor.spec.ts         Monitor screen tests
  playwright.config.ts
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  package.json
```
