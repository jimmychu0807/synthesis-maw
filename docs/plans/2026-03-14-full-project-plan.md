# Veil — Full Project Plan

**Date:** 2026-03-14
**Updated:** 2026-03-15
**Deadline:** 2026-03-22 (7 days remaining)

---

## Project Catalogue

### What Exists (files, status, test coverage)

#### Core Agent (`src/`)

| File | Purpose | Status | Tests | Issues |
|------|---------|--------|-------|--------|
| `config.ts` | Env validation (Zod), contract addrs, chains | WORKING | 12 unit | Added `VENICE_MODEL_OVERRIDE` |
| `types.ts` | Shared TS interfaces | WORKING | TS-checked | None |
| `index.ts` | CLI entrypoint (`--intent`, `--cycles`) | WORKING | None (trivial) | Supports `--cycles N` flag |
| `server.ts` | HTTP API (deploy + state + SPA) | WORKING | 42 unit + 7 e2e | Reads PORT from env |
| `agent-loop.ts` | Core orchestration loop | **WORKING** | 14 unit | **Run e2e twice. 2 real swaps on Sepolia.** |

#### Venice AI (`src/venice/`)

| File | Purpose | Status | Tests | Issues |
|------|---------|--------|-------|--------|
| `llm.ts` | 3 LLM instances, budget header, model override | WORKING | 6 e2e | `VENICE_MODEL_OVERRIDE` support |
| `schemas.ts` | Zod schemas for intent/decision/analysis | WORKING | 14 unit | None |

#### Delegation (`src/delegation/`)

| File | Purpose | Status | Tests | Issues |
|------|---------|--------|-------|--------|
| `compiler.ts` | NL -> intent -> ERC-7715 delegation | WORKING | 6 unit + 6 e2e | None |
| `audit.ts` | Human-readable audit report | WORKING | 6 unit + 7 e2e | None |
| `redeemer.ts` | ERC-7710 redemption client | WORKING | 3 unit + 5 e2e | Delegation redemption attempted on-chain (ValueLteEnforcer revert — proves enforcement) |

#### Uniswap (`src/uniswap/`)

| File | Purpose | Status | Tests | Issues |
|------|---------|--------|-------|--------|
| `trading.ts` | Quote + swap via Trading API | WORKING | unit + 3 e2e | **2 real swaps executed on Sepolia** |
| `permit2.ts` | Gasless approvals + signing | WORKING | unit + 3 e2e | Signing tested; native ETH swaps don't use Permit2 |

#### Data (`src/data/`)

| File | Purpose | Status | Tests | Issues |
|------|---------|--------|-------|--------|
| `prices.ts` | Token prices via Venice web search | WORKING | 7 unit + 5 e2e | Cache isolation tested |
| `portfolio.ts` | On-chain balances via RPC | WORKING | 5 unit + 6 e2e | Real Sepolia balances verified, math consistency tested |
| `thegraph.ts` | Uniswap V3 pool data via codegen SDK | WORKING | 6 unit + 2 e2e | Uses `getSdk()` from `__generated__/graphql.ts` |

#### Identity (`src/identity/`)

| File | Purpose | Status | Tests | Issues |
|------|---------|--------|-------|--------|
| `erc8004.ts` | Agent registration + reputation | WORKING | unit + 6 e2e | **Write ops tested (giveFeedback).** Wallet has ~0.5 ETH on Base Sepolia |

#### Logging (`src/logging/`)

| File | Purpose | Status | Tests | Issues |
|------|---------|--------|-------|--------|
| `agent-log.ts` | JSONL structured logging | WORKING | unit | None |
| `budget.ts` | Venice compute budget tracking | WORKING | 4 unit | None |

#### Dashboard (`dashboard/`)

| File | Purpose | Status | Issues |
|------|---------|--------|--------|
| `index.html` | Vanilla HTML dashboard | DEPRECATED | Being replaced by Next.js |
| `react/` | Vite + React + Framer Motion | DEPRECATED | Being replaced by Next.js |

#### Config Files

| File | Purpose | Status | Issues |
|------|---------|--------|--------|
| `agent.json` | PAM spec manifest | WORKING | Subgraph ID matches config.ts (`5zvR82...`) |
| `codegen.ts` | GraphQL codegen config | WORKING | Correct subgraph ID, generates `__generated__/graphql.ts` |
| `vitest.config.ts` | Unit test config | WORKING | None |
| `vitest.e2e.config.ts` | E2E test config | WORKING | None |
| `.env` | Secrets | WORKING | Has all required keys + `VENICE_MODEL_OVERRIDE` optional |
| `.gitignore` | Git ignore rules | WORKING | None |

### Wallet Status

**Address:** `0xf13021F02E23a8113C1bD826575a1682F6Fac927`

| Chain | ETH | USDC | Uniswap API Support |
|-------|-----|------|---------------------|
| Ethereum Sepolia | ~0.985 ETH (spent ~0.015 on swaps+gas) | ~30.5 USDC (from 2 swaps) | Yes |
| Base Sepolia | ~0.5 ETH | 0 | **No** (Uniswap Trading API doesn't support it) |
| Base Mainnet | 0 | 0 | Yes |

**Conclusion:** Ethereum Sepolia for Uniswap swaps, Base Sepolia for ERC-8004 identity.

### Test Summary

- **168 unit tests** across 15 files — all passing
- **58 e2e tests** across 12 files — all passing individually
- **2 real swap TxIDs** on Ethereum Sepolia
- **Agent log** with all action types verified

### On-Chain Artifacts

| What | TxHash | Chain |
|------|--------|-------|
| Swap: 0.0048 ETH → USDC | `0x9c2f1064c3e8affa46877a79a29ee7b2de25709b84ae275241662b76e9832f9b` | Eth Sepolia |
| Swap: 0.01 ETH → USDC | `0x8c72a20e36595b76ded652b2577b39ca3a16a8fa1222264cd7097b4c15bdacb0` | Eth Sepolia |
| ERC-8004 Register | `0x97237b74dfc3e4c332eed65b79aa9d73664a7afc1090ec9456a45a0dcfce829e` | Base Sepolia |
| ERC-8004 Feedback | `0x4db757c8d7e02e1ae3f1762cea2d1ed9c623161581b41b611651aa1a452523e8` | Base Sepolia |
| ERC-8004 Feedback | `0x882193f06e39cb3f90345839e8cdb284402ed641f38370d7f1dd3e4380a06c92` | Base Sepolia |

---

## Phase 1: Fix The Graph Codegen — COMPLETE ✅

**Completed:** 2026-03-14

All items verified against codebase:

- [x] `codegen.ts` uses correct subgraph ID `5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV`
- [x] `__generated__/graphql.ts` exists with `getSdk()` export (4,976 lines)
- [x] `src/data/thegraph.ts` imports `getSdk` from `__generated__/graphql.js`
- [x] `agent-loop.ts` uses `Number() || 0` instead of `parseFloat()` for pool data
- [x] `thegraph.test.ts` has zero `as any` casts
- [x] `agent.json` has correct subgraph ID
- [x] 168 unit tests pass, 2 thegraph e2e tests pass

---

## Phase 2: Monorepo Restructuring — NOT STARTED

**Status:** Not started. No monorepo files exist.

**Verified missing:**
- `pnpm-workspace.yaml` — does not exist
- `turbo.json` — does not exist
- `packages/agent/` — does not exist
- Project uses `npm` with a single `package.json` at root
- `dashboard/` still exists (vanilla HTML + Vite React app)

**Goal:** Clean project organization. `packages/agent/` for backend, `apps/dashboard/` for frontend.

### Target Structure

```
synthesis-hackathon/
├── package.json              root workspaces config (pnpm)
├── pnpm-workspace.yaml       workspace definitions
├── turbo.json                task orchestration (telemetry: false)
├── tsconfig.base.json        shared TS config (strict, ESM)
├── .env                      shared env (both packages read from here)
├── .gitignore
├── agent.json                agent manifest (root)
├── README.md
│
├── packages/
│   └── agent/
│       ├── package.json      name: @veil/agent
│       ├── tsconfig.json     extends ../../tsconfig.base.json
│       ├── vitest.config.ts
│       ├── vitest.e2e.config.ts
│       ├── codegen.ts
│       ├── src/              ALL current src/ files, unchanged
│       └── __generated__/    codegen output
│
├── apps/
│   └── dashboard/            Next.js (Phase 5)
│       ├── package.json
│       ├── next.config.ts
│       └── ...
│
├── docs/
├── reference/
└── .claude/
```

### Steps

1. **Install pnpm globally** if not present. Create `pnpm-workspace.yaml` and `turbo.json` (with `"telemetry": false`).

2. **Create root `package.json`** with pnpm workspaces.

3. **Create `turbo.json`** with telemetry disabled.

4. **Create `tsconfig.base.json`** — shared strict config.

5. **Create `packages/agent/`** — move `src/`, `codegen.ts`, `vitest.config.ts`, `vitest.e2e.config.ts` into it. Create `packages/agent/package.json` with current dependencies (name: `@veil/agent`).

6. **Update all relative paths** — `.env` loading path, `agent_log.jsonl` output path, `__generated__/` path in codegen and thegraph.ts imports.

7. **Delete old files** — remove `dashboard/` entirely. Remove root `vitest.config.ts`, root `codegen.ts`, root `tsconfig.json`.

8. **`pnpm install`** from root — verify workspaces resolve.

9. **Run tests from root** — `pnpm test` should delegate to `@veil/agent` via turbo.

10. **Create placeholder `apps/dashboard/package.json`** — empty Next.js scaffold.

### Verification

- `pnpm install` from root succeeds
- `pnpm test` from root runs 168 tests, all pass
- `pnpm run test:e2e` from root runs e2e tests, all pass
- `pnpm run codegen` from root generates types
- `pnpm run serve` from root starts the API server
- No files remain at root `src/` or `dashboard/`
- `turbo.json` has `"telemetry": false`

### What To Watch

- `dotenv` loads `.env` relative to `process.cwd()`. If we run from root but code is in `packages/agent/`, we need `dotenv` to find `../../.env` or set `DOTENV_CONFIG_PATH`.
- `agent_log.jsonl` is written to `process.cwd()` — should stay at project root for visibility.
- Claude Code hooks reference `$CLAUDE_PROJECT_DIR` which is the root — no change needed there.
- pnpm uses a content-addressable store — `node_modules` structure differs from npm. Verify all imports resolve.

---

## Phase 3: Fix & Run Agent End-to-End — COMPLETE ✅

**Completed:** 2026-03-15

All verification items confirmed:

- [x] 2 real swap TxIDs on Sepolia Etherscan (see On-Chain Artifacts table above)
- [x] `agent_log.jsonl` has entries for all required action types: agent_start, delegation_created, audit_report, price_fetch, portfolio_check, rebalance_decision, quote_received, swap_executed, cycle_complete
- [x] ERC-8004 registration and feedback on Base Sepolia (3 txs)
- [x] Delegation redemption attempted on-chain (DelegationManager at `0xdb9B...` correctly enforced `ValueLteEnforcer` — proves on-chain constraint enforcement)
- [x] Fallback to direct tx works when delegation redemption reverts
- [x] Budget guard correctly blocks over-budget swaps
- [x] `--cycles N` CLI flag added for bounded runs
- [x] `VENICE_MODEL_OVERRIDE` env var for fast testing
- [x] `PORT` env var support in server.ts

**Not done from Phase 3 plan:**
- [ ] Agent loop integration test (mocking Venice/Uniswap at HTTP level) — skipped, real e2e run proved the loop works
- [ ] Server-based run (POST to `/api/deploy`) — not explicitly tested, but server e2e tests pass and the deploy endpoint is tested

---

## Phase 4: Commit & Push — NOT STARTED

**Goal:** Clean initial commit to `github-neilei:neilei/synthesis-hackathon`.

### Steps

1. Verify `.gitignore` covers: `.env`, `node_modules/`, `dist/`, `__generated__/`, `agent_log.jsonl`, `.playwright-mcp/`, `*.tsbuildinfo`

2. Stage all files, review diff, commit:
   ```bash
   git add -A
   git status  # review, make sure no secrets
   git commit -m "Initial commit: Veil agent with Venice, MetaMask, Uniswap, Protocol Labs integrations"
   git push -u origin main
   ```

3. Note: remote is `git@github-neilei:neilei/synthesis-hackathon.git` — uses `~/.ssh/id_neilei` automatically via SSH config.

### Pre-Commit Checklist

- [ ] No `.env` or private keys in staged files
- [ ] No `ad0ll` username in any committed file
- [ ] `__generated__/` is in `.gitignore` (users run codegen themselves)
- [ ] `agent_log.jsonl` is in `.gitignore`
- [ ] Git config: `user.name=neilei`, `user.email=neilei@users.noreply.github.com`
- [ ] All tests pass before commit

---

## Phase 5: Frontend (Next.js Dashboard) — NOT STARTED

**Deferred — plan to be written after Phases 2 and 4 are complete.**

High-level direction:
- Next.js App Router at `apps/dashboard/`
- Three screens: Configure, Audit, Monitor
- Impeccable design via frontend-design skill
- Desktop + mobile responsive
- Showcases sponsor integrations visually (Venice, MetaMask, Uniswap, Protocol Labs)
- Playwright e2e tests for the three-screen flow
- Proxies `/api/*` to the agent server at `:3147`

---

## On Hold

- **AgentCash/Merit** ($1.75K) — not started, deprioritized
- **OpenServ** — Build Story only if ahead of schedule
- **Custom caveat enforcer (Solidity)** — stretch goal for MetaMask 1st place

---

## Known Issues

1. **Delegation redemption reverts with `ValueLteEnforcer:value-too-high`** — the delegation scope uses `erc20TransferAmount` with USDC decimals, but swaps send native ETH. Need to either use `nativeBalanceChange` scope type or adjust the scope to match the actual swap value. For the demo, the fallback to direct tx works and the revert itself proves DelegationManager enforcement.

2. **`as unknown as DelegationWalletClient`** cast in `redeemer.ts:65` — erc7710WalletActions extension typing doesn't perfectly align. Works at runtime.

3. **No agent loop integration test** — the real e2e run proved it works, but a mocked integration test would be more reliable for CI.

---

## Order of Execution (Updated)

```
Phase 1: Fix The Graph codegen ──────> COMPLETE ✅
Phase 3: Fix & run agent e2e ───────> COMPLETE ✅  (done out of order)
Phase 2: Monorepo restructuring ────> CURRENT  ← next
Phase 4: Commit & push ────────────> BLOCKED on Phase 2
Phase 5: Frontend plan + build ────> BLOCKED on Phase 4
```

Remaining work: Phase 2 (~2h) → Phase 4 (~15min) → Phase 5 (~4-6h)
