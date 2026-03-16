# Activity Feed & Cycle History Design

## Problem

Three gaps in the dashboard's Monitor tab:

1. **Cycle errors are invisible** — backend logs errors to `agent_log.jsonl` and exposes them in the `feed` array via `/api/state`, but the frontend only extracts rebalance decisions and ignores everything else.
2. **No historical cycle data** — `AgentState` is a mutable singleton that overwrites allocation/drift/value each cycle. The frontend shows only the current snapshot with no way to see what happened in previous cycles.
3. **AI Reasoning card is too narrow** — it only shows the latest rebalance decision. No context about what else happened in that cycle or any prior cycle.

## Solution

### Backend Changes

**1. Add `cycle` field to `AgentLogEntrySchema`**

Add `cycle: z.number().optional()` to the schema in `@veil/common`. Optional so old log entries still parse. The `logAction()` function in `agent-log.ts` accepts an optional cycle number parameter.

**2. Enrich `cycle_complete` log entries with state snapshot**

The `cycle_complete` entry's `result` field currently has `{ tradesExecuted, totalSpentUsd, budgetTier }`. Add:

- `allocation: Record<string, number>`
- `drift: number`
- `totalValue: number`
- `ethPrice: number`

These come from `AgentState` at the time the entry is logged — no new data fetching needed.

**3. Pass cycle number through agent loop**

In `agent-loop.ts`, pass `state.cycle` to every `logAction()` call inside `runCycle()` and the cycle error/complete handlers. No structural changes to the loop.

### Frontend Changes

**1. Replace AI Reasoning card with Activity Feed**

Same grid position (right column of the middle row in Monitor). The AI Reasoning card is removed entirely — rebalance decisions become entries in the feed.

**2. Activity Feed card layout**

- ~400px fixed height with internal scroll
- Newest cycle at bottom (chronological, like a terminal)
- Auto-scrolls to bottom unless user has scrolled up; resumes auto-scroll when user scrolls back to bottom
- Sponsor badge ("Powered by Venice") at bottom of card

**3. Cycle grouping**

Feed entries are grouped by their `cycle` field. Each group has:

- **Cycle header**: zinc-800 background bar showing cycle number, portfolio value, drift %, allocation summary. Data comes from the `cycle_complete` entry's enriched `result` field.
- **Entries**: collapsed by default. Click the cycle header to expand and show all entries within that cycle.

Entries without a `cycle` field (pre-cycle actions like `agent_start`, `audit_report`) go in an "Initialization" group at the top.

**4. Entry visual treatment**

| Entry type | Visual |
|---|---|
| Rebalance decision | Badge (Hold green / Rebalance emerald) + reasoning text |
| Swap executed | Token pair + amount + status badge + Etherscan link |
| Error (any) | Red text + error message |
| Other (permit2, delegation, identity, data fetch) | Muted secondary text |

**5. Empty state**

Before any cycles: "Waiting for the agent's first cycle..." centered in the card.

## Testing

**Backend (vitest):**
- `logAction()` includes `cycle` field when provided
- `cycle_complete` result includes snapshot fields

**Frontend (vitest):**
- Feed grouping logic: flat `AgentLogEntry[]` → grouped by cycle, handles missing cycle numbers, sorts chronologically
- Entry rendering: error entries red, rebalance entries show badge + reasoning, swap entries show pair + link

**Frontend (playwright e2e):**
- Deploy intent, wait for 2+ cycles, verify feed shows cycle headers with metrics and expandable entries

## Files Affected

### Backend
- `packages/common/src/schemas.ts` — add `cycle` to `AgentLogEntrySchema`
- `packages/agent/src/logging/agent-log.ts` — accept cycle param in `logAction()`
- `packages/agent/src/agent-loop.ts` — pass cycle to all `logAction()` calls, enrich `cycle_complete` result

### Frontend
- `apps/dashboard/components/monitor.tsx` — remove AI Reasoning card, add Activity Feed
- `apps/dashboard/components/activity-feed.tsx` — new component: feed container with scroll behavior
- `apps/dashboard/components/cycle-group.tsx` — new component: collapsible cycle header + entry list
- `apps/dashboard/components/feed-entry.tsx` — new component: renders individual log entries by type
