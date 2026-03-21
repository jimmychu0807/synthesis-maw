# Delegation Allowance Checking & Cycle Error Judging

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Two improvements to the agent loop:
1. Query on-chain delegation allowance *before* consulting Venice for rebalance decisions, so the LLM knows how much it can actually spend and the agent never attempts a pull that will revert.
2. Invoke the judge on cycle errors (failed token pulls, failed swaps that throw out of `executeSwap`), so every cycle gets evaluated regardless of outcome.

**Why this matters:**
- The agent currently wastes Venice LLM calls reasoning about trades it can't execute (the `ERC20PeriodTransferEnforcer` reverts the tx on-chain, burning gas and time).
- When a cycle errors (e.g., token pull fails), the judge is never invoked — the error bubbles up to the main loop's catch block in `index.ts:349`, which logs `cycle_error` but doesn't evaluate the agent's decision quality. This means failed cycles are invisible to the ERC-8004 reputation system.

**SDK functions used:**
- `decodeDelegations(hex)` from `@metamask/smart-accounts-kit/utils` — decodes permission context hex into `Delegation[]`
- `getSmartAccountsEnvironment(chainId)` from `@metamask/smart-accounts-kit/utils` — returns `SmartAccountsEnvironment` with contract addresses
- `caveatEnforcerActions({ environment })` from `@metamask/smart-accounts-kit/actions` — client extension providing:
  - `getErc20PeriodTransferEnforcerAvailableAmount({ delegation })` → `{ availableAmount: bigint, isNewPeriod: boolean, currentPeriod: bigint }`
  - `getNativeTokenPeriodTransferEnforcerAvailableAmount({ delegation })` → same shape

**Design doc:** N/A — this is a focused improvement, not a new feature.

---

### Task 1: Create `packages/agent/src/delegation/allowance.ts` — On-Chain Allowance Queries

**Files:**
- Create: `packages/agent/src/delegation/allowance.ts`

**Step 1:** Create the new module with two exported functions:

```typescript
// packages/agent/src/delegation/allowance.ts
import { createPublicClient, type Hex } from "viem";
import { sepolia } from "viem/chains";
import { decodeDelegations } from "@metamask/smart-accounts-kit/utils";
import { caveatEnforcerActions } from "@metamask/smart-accounts-kit/actions";
import { getSmartAccountsEnvironment } from "@metamask/smart-accounts-kit/utils";
import { rpcTransport } from "../config.js";
import { logger } from "../logging/logger.js";

export interface DelegationAllowance {
  /** Remaining amount in smallest unit (wei for ETH, raw for ERC-20) */
  availableAmount: bigint;
  /** Whether this is a fresh period (no prior spending) */
  isNewPeriod: boolean;
  /** Current period index */
  currentPeriod: bigint;
}

/**
 * Query remaining ERC-20 periodic transfer allowance from on-chain enforcer.
 * Returns null if the query fails (e.g., no matching enforcer caveat).
 */
export async function getErc20Allowance(
  permissionContext: Hex,
  chainId: number,
): Promise<DelegationAllowance | null> { ... }

/**
 * Query remaining native token (ETH) periodic transfer allowance.
 * Returns null if the query fails.
 */
export async function getNativeAllowance(
  permissionContext: Hex,
  chainId: number,
): Promise<DelegationAllowance | null> { ... }
```

**Implementation details for each function:**
1. Call `getSmartAccountsEnvironment(chainId)` to get the environment.
2. Create a `publicClient` with `rpcTransport` for the chain.
3. Extend the client with `caveatEnforcerActions({ environment })`.
4. Call `decodeDelegations(permissionContext)` to get `Delegation[]`. Use the first delegation (`delegations[0]`).
5. Call the appropriate enforcer function (`getErc20PeriodTransferEnforcerAvailableAmount` or `getNativeTokenPeriodTransferEnforcerAvailableAmount`) with `{ delegation }`.
6. Return the result, or `null` on error (with a warning log).

**Step 2:** Wrap each function body in try/catch. On error, log a warning and return `null`. The caller will treat `null` as "unknown allowance — proceed without constraint".

**Verify:** `pnpm run build` compiles without errors.

---

### Task 2: Unit Tests for Allowance Module

**Files:**
- Create: `packages/agent/src/delegation/__tests__/allowance.test.ts`

**Step 1:** Write unit tests that mock the SDK functions:
- Mock `@metamask/smart-accounts-kit/utils` (decodeDelegations, getSmartAccountsEnvironment)
- Mock `@metamask/smart-accounts-kit/actions` (caveatEnforcerActions)
- Test: `getErc20Allowance` returns `DelegationAllowance` when SDK returns successfully
- Test: `getErc20Allowance` returns `null` when SDK throws
- Test: `getNativeAllowance` returns `DelegationAllowance` when SDK returns successfully
- Test: `getNativeAllowance` returns `null` when SDK throws
- Test: both functions pass the correct delegation (first from decoded array) to the enforcer

**Verify:** `pnpm test -- --run packages/agent/src/delegation/__tests__/allowance.test.ts`

---

### Task 3: Integrate Allowance Check into `runCycle` Before Venice Reasoning

**Files:**
- Modify: `packages/agent/src/agent-loop/index.ts` (lines ~537-583, `runCycle` function)

**Step 1:** Import the new allowance functions at the top of the file:

```typescript
import { getErc20Allowance, getNativeAllowance } from "../delegation/allowance.js";
```

**Step 2:** After drift check passes (line ~563) but *before* calling `getRebalanceDecision` (line ~568), query allowances for each permission the agent holds:

```typescript
// Query delegation allowances before consulting Venice
const allowances: Record<string, { available: bigint; decimals: number }> = {};
for (const perm of state.permissions) {
  if (perm.type === "erc20-token-periodic") {
    const result = await getErc20Allowance(perm.context as Hex, config.chainId);
    if (result) {
      allowances[perm.token.toUpperCase()] = { available: result.availableAmount, decimals: 6 }; // USDC = 6
    }
  } else if (perm.type === "native-token-periodic") {
    const result = await getNativeAllowance(perm.context as Hex, config.chainId);
    if (result) {
      allowances["ETH"] = { available: result.availableAmount, decimals: 18 };
    }
  }
}
```

**Step 3:** Log the allowances as a feed entry:

```typescript
config.intentLogger?.log("delegation_allowance", {
  cycle: state.cycle,
  tool: "metamask-caveat-enforcer",
  result: Object.fromEntries(
    Object.entries(allowances).map(([token, { available, decimals }]) => [
      token,
      { availableRaw: available.toString(), availableFormatted: formatUnits(available, decimals) },
    ]),
  ),
});
```

Import `formatUnits` from `viem` at the top of the file.

**Step 4:** Pass the allowances to `getRebalanceDecision`. Add an optional `allowances` parameter to the function signature:

```typescript
const decision = await getRebalanceDecision(config, state, { ...market, drift, maxDrift }, allowances);
```

Update the function signature accordingly (Task 4).

**Verify:** `pnpm run build` compiles. Existing tests still pass (`pnpm test`).

---

### Task 4: Feed Allowance Data into Venice Reasoning Prompt

**Files:**
- Modify: `packages/agent/src/agent-loop/index.ts` (lines ~442-531, `getRebalanceDecision` function)

**Step 1:** Add an `allowances` parameter to `getRebalanceDecision`:

```typescript
async function getRebalanceDecision(
  config: AgentConfig,
  state: AgentState,
  market: MarketData & { drift: Record<string, number>; maxDrift: number },
  allowances?: Record<string, { available: bigint; decimals: number }>,
): Promise<...> {
```

**Step 2:** Build an allowance context string for the system prompt. Insert it after the existing budget info (line ~473):

```typescript
const allowanceContext = allowances && Object.keys(allowances).length > 0
  ? `\nDelegation allowances (remaining in current period):\n${
      Object.entries(allowances)
        .map(([token, { available, decimals }]) => {
          const formatted = formatUnits(available, decimals);
          return `- ${token}: ${formatted} (raw: ${available.toString()})`;
        })
        .join("\n")
    }\n\nCRITICAL: You MUST NOT propose a sellAmount exceeding the delegation allowance for that token. The on-chain enforcer will revert the transaction. If the allowance is 0, do NOT propose a swap for that token.`
  : "";
```

**Step 3:** Append `allowanceContext` to the system prompt string, right after the existing HARD RULES section.

**Step 4:** Also add a hard rule:
```
6. The sellAmount MUST NOT exceed the delegation allowance for the sell token. Check the "Delegation allowances" section above.
```

**Verify:** `pnpm run build` compiles. Review the prompt to ensure it reads naturally.

---

### Task 5: Pre-Check Allowance in `executeSwap` Before Token Pull

**Files:**
- Modify: `packages/agent/src/agent-loop/swap.ts` (lines ~125-187, token pull section)

**Step 1:** Import the allowance functions:

```typescript
import { getErc20Allowance, getNativeAllowance } from "../delegation/allowance.js";
```

**Step 2:** Before each token pull attempt, check the on-chain allowance. If the sell amount exceeds the allowance, skip the pull and throw a descriptive error instead of letting it revert on-chain:

For ETH pulls (line ~134):
```typescript
if (isEthSell && ethPermission) {
  const sellAmountWei = parseUnits(swap.sellAmount, 18);
  // Pre-check: is there enough delegation allowance?
  const allowance = await getNativeAllowance(ethPermission.context as Hex, config.chainId);
  if (allowance && allowance.availableAmount < sellAmountWei) {
    const available = formatUnits(allowance.availableAmount, 18);
    throw new Error(
      `Delegation allowance insufficient: need ${swap.sellAmount} ETH but only ${available} ETH available in current period`,
    );
  }
  // ... existing pullNativeToken call
```

For ERC-20 pulls (line ~160):
```typescript
} else if (!isEthSell && erc20Permission) {
  const sellAmountRaw = parseUnits(swap.sellAmount, decimals);
  const allowance = await getErc20Allowance(erc20Permission.context as Hex, config.chainId);
  if (allowance && allowance.availableAmount < sellAmountRaw) {
    const available = formatUnits(allowance.availableAmount, decimals);
    throw new Error(
      `Delegation allowance insufficient: need ${swap.sellAmount} ${swap.sellToken} but only ${available} ${swap.sellToken} available in current period`,
    );
  }
  // ... existing pullErc20Token call
```

Import `formatUnits` from `viem`.

**Why both Task 3 AND Task 5?** Task 3 gives Venice the info to size trades correctly. Task 5 is a safety net — if the LLM ignores the constraint or if allowance changes between reasoning and execution, the agent catches it before burning gas on a doomed tx.

**Verify:** `pnpm run build` compiles. Existing tests still pass.

---

### Task 6: Add `delegation_allowance` Feed Label to Dashboard

**Files:**
- Modify: `apps/dashboard/components/feed-entry.tsx`

**Step 1:** Add `delegation_allowance: "Allowance"` to the `getEntryLabel` function's label map.

**Step 2:** The existing generic rendering should handle the result object fine (it shows JSON). No custom rendering needed for now.

**Verify:** `pnpm run build:dashboard` compiles.

---

### Task 7: Judge Cycle Errors in the Main Loop

**Files:**
- Modify: `packages/agent/src/agent-loop/index.ts` (lines ~347-361, main loop catch block)

This is the core of issue #2. Currently:

```typescript
try {
  await runCycle(config, state, agentAddress, chain);
} catch (err) {
  // logs cycle_error but never calls judge
}
```

**Step 1:** Import `evaluateSwapFailure` and `SwapFailureEvidenceInput` at the top if not already imported. They're currently only used in `swap.ts`. We need them in the main loop too.

Actually — `evaluateSwapFailure` is already imported in `swap.ts`, and the main loop calls `runCycle` → `executeSwap`. The issue is that errors thrown from `executeSwap` (like token pull failures) propagate through `runCycle` into the main loop catch, *after* `executeSwap`'s own catch block has already run for swap-level failures.

Let me trace the exact flow:
- `executeSwap` has its own try/catch around the swap (lines 235-591). Inside that catch, it already calls `evaluateSwapFailure` for swap failures.
- But token pull failures (lines 155-159, 182-186) `throw new Error("Token pull failed: ...")` which exits `executeSwap` entirely — the swap-level try/catch doesn't cover the pull section.
- This throw propagates to `runCycle` (line 574), which has no catch, so it propagates to the main loop catch (line 349).

**The fix:** Move the token pull code inside the existing try/catch in `executeSwap`, OR add a dedicated catch for cycle-level errors in the main loop.

**Preferred approach:** Add cycle-level judging in the main loop catch. This covers ALL cycle errors (not just token pull failures) — including potential future errors from market data gathering, Venice reasoning, etc.

**Step 2:** In the main loop catch block (index.ts lines 349-361), after logging the cycle error, invoke `evaluateSwapFailure` if the agent has an `agentId` and `JUDGE_PRIVATE_KEY`:

```typescript
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  logger.error({ err, cycle: state.cycle }, "Cycle error");
  logAction("cycle_error", {
    cycle: state.cycle,
    parameters: { cycle: state.cycle },
    error: msg,
  });
  config.intentLogger?.log("cycle_error", {
    cycle: state.cycle,
    error: msg,
  });

  // Judge the failed cycle — even errors deserve evaluation
  if (state.agentId != null && env.JUDGE_PRIVATE_KEY) {
    try {
      const failureInput: SwapFailureEvidenceInput = {
        agentId: state.agentId,
        intentId: config.intentId ?? "unknown",
        cycle: state.cycle,
        intent: {
          targetAllocation: config.intent.targetAllocation,
          dailyBudgetUsd: config.intent.dailyBudgetUsd,
          driftThreshold: config.intent.driftThreshold,
          maxSlippage: config.intent.maxSlippage,
          timeWindowDays: config.intent.timeWindowDays,
          maxTradesPerDay: config.intent.maxTradesPerDay,
          maxPerTradeUsd: config.intent.maxPerTradeUsd,
        },
        beforeSwap: {
          allocation: { ...state.allocation },
          drift: state.drift,
          portfolioValueUsd: state.totalValue,
        },
        attemptedSwap: { sellToken: "unknown", buyToken: "unknown", sellAmount: "0" },
        errorMessage: msg,
        agentReasoning: "Cycle failed before swap execution",
        marketContext: { ethPriceUsd: state.ethPrice },
      };

      logAction("judge_started", { cycle: state.cycle, tool: "venice-judge", result: { outcome: "cycle_error" } });
      config.intentLogger?.log("judge_started", { cycle: state.cycle, tool: "venice-judge", result: { outcome: "cycle_error" } });

      const result = await evaluateSwapFailure(failureInput, "rebalance", state.budgetTier === "critical");
      const judgeModel = state.budgetTier === "critical" ? FAST_MODEL : REASONING_MODEL;
      logAction("judge_completed", {
        cycle: state.cycle,
        tool: "venice-judge",
        result: { outcome: "cycle_error", composite: result.composite, scores: result.scores, model: judgeModel },
      });
      config.intentLogger?.log("judge_completed", {
        cycle: state.cycle,
        tool: "venice-judge",
        result: { outcome: "cycle_error", composite: result.composite, scores: result.scores, model: judgeModel },
      });
    } catch (judgeErr) {
      logger.warn({ err: judgeErr }, "Judge evaluation for cycle error failed");
      config.intentLogger?.log("judge_failed", {
        cycle: state.cycle,
        tool: "venice-judge",
        error: judgeErr instanceof Error ? judgeErr.message : String(judgeErr),
      });
    }
  }
}
```

**Step 3:** Add necessary imports at the top of `index.ts`:

```typescript
import { evaluateSwapFailure } from "../identity/judge.js";
import type { SwapFailureEvidenceInput } from "../identity/evidence.js";
```

**Note:** The `attemptedSwap` field uses placeholder values ("unknown") because at the main-loop level, we may not have swap details (the error could be from market data gathering or Venice reasoning, before any swap was planned). The judge's LLM prompt will see the error message and can contextualize accordingly.

**Verify:** `pnpm run build` compiles. Existing tests still pass.

---

### Task 8: Prevent Double-Judging for Swap Failures

**Files:**
- Modify: `packages/agent/src/agent-loop/swap.ts` (lines ~472-476)

**Problem:** If `executeSwap` catches a swap error and judges it (lines 490-581), then re-throws (e.g., `JudgeConfigError`), the main loop catch from Task 7 will judge it *again*. We need to prevent this.

**Step 1:** Have `executeSwap` set a flag on the error or on state when it has already judged a failure. The simplest approach: add a `lastCycleJudged` field to `AgentState`.

Add to the `AgentState` interface (in `index.ts`):
```typescript
lastCycleJudged?: number;
```

**Step 2:** In `executeSwap`, after the swap-failure judge runs (line ~554), set:
```typescript
state.lastCycleJudged = state.cycle;
```

Also set it after successful swap judging (line ~429):
```typescript
state.lastCycleJudged = state.cycle;
```

**Step 3:** In the main loop catch (Task 7 code), guard the judge invocation:
```typescript
if (state.agentId != null && env.JUDGE_PRIVATE_KEY && state.lastCycleJudged !== state.cycle) {
```

This ensures: if `executeSwap` already judged this cycle (success or failure), the main loop won't re-judge. If the error occurred before `executeSwap` was called (market data, Venice reasoning), the main loop will judge it.

**Verify:** `pnpm run build` compiles. Existing tests still pass.

---

### Task 9: Update Existing Tests

**Files:**
- Modify: `packages/agent/src/__tests__/agent-loop.test.ts`
- Modify: `packages/agent/src/__tests__/swap-safety.test.ts`

**Step 1:** Update mocks to include the new allowance module:
```typescript
vi.mock("../delegation/allowance.js", () => ({
  getErc20Allowance: vi.fn().mockResolvedValue({ availableAmount: 1000000000n, isNewPeriod: false, currentPeriod: 1n }),
  getNativeAllowance: vi.fn().mockResolvedValue({ availableAmount: 1000000000000000000n, isNewPeriod: false, currentPeriod: 1n }),
}));
```

**Step 2:** Update `AgentState` test fixtures to include `lastCycleJudged: undefined`.

**Step 3:** Add a test case in `swap-safety.test.ts` that verifies: when `getErc20Allowance` returns an amount less than the sell amount, `executeSwap` throws with "Delegation allowance insufficient".

**Step 4:** If `evaluateSwapFailure` is now imported in `index.ts`, ensure the mock in `agent-loop.test.ts` covers it.

**Verify:** `pnpm test -- --run`

---

### Task 10: E2E Test for Allowance Query Against Sepolia

**Files:**
- Create: `packages/agent/src/delegation/__tests__/allowance.e2e.test.ts`

**Step 1:** Write an e2e test that:
1. Uses a real permission context hex from the existing intent (query from DB or use a hardcoded test value from a known grant)
2. Calls `getErc20Allowance` against Sepolia
3. Asserts the result is non-null with `availableAmount` as a bigint
4. Calls `getNativeAllowance` against Sepolia
5. Asserts the result shape

**Step 2:** Mark as `.e2e.test.ts` so it only runs with `pnpm run test:e2e`.

**Verify:** `pnpm run test:e2e -- --run packages/agent/src/delegation/__tests__/allowance.e2e.test.ts`

---

### Task 11: Build, Lint, Full Test Suite

**Files:** None (verification only)

**Step 1:** Run full build: `turbo run build`
**Step 2:** Run lint: `turbo run lint`
**Step 3:** Run unit tests: `turbo run test:unit`
**Step 4:** Fix any issues found.

---

### Task 12: Update CLAUDE.md if Needed

**Files:**
- Possibly modify: `CLAUDE.md`

**Step 1:** Review whether any new key technical decisions need to be documented (e.g., "Delegation allowance queries use caveatEnforcerActions from SDK"). Only update if there's genuinely new architectural info that would help future development.

**Step 2:** Commit all changes.
