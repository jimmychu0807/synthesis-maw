/**
 * Venice API budget tracker. Captures x-venice-balance-usd and x-venice-balance-diem
 * headers to determine budget tier and per-request DIEM cost.
 *
 * @module @maw/agent/logging/budget
 */
let lastKnownBalance: number | null = null;
let lastKnownDiemBalance: number | null = null;
let lastDiemCost: number | null = null;
let totalCallCount = 0;

export function updateBudget(responseHeaders: Record<string, string>) {
  let updated = false;

  const balanceHeader = responseHeaders["x-venice-balance-usd"];
  if (balanceHeader) {
    const parsed = parseFloat(balanceHeader);
    if (!isNaN(parsed)) {
      lastKnownBalance = parsed;
      updated = true;
    }
  }

  const diemHeader = responseHeaders["x-venice-balance-diem"];
  if (diemHeader) {
    const parsed = parseFloat(diemHeader);
    if (!isNaN(parsed)) {
      if (lastKnownDiemBalance !== null && lastKnownDiemBalance > parsed) {
        lastDiemCost = lastKnownDiemBalance - parsed;
      } else {
        lastDiemCost = null;
      }
      lastKnownDiemBalance = parsed;
      updated = true;
    }
  }

  if (updated) totalCallCount++;
}

/** Returns and clears the DIEM cost of the most recent Venice API call. */
export function consumeLastDiemCost(): number | null {
  const cost = lastDiemCost;
  lastDiemCost = null;
  return cost;
}

export function getBudgetState() {
  return {
    remainingUsd: lastKnownBalance,
    remainingDiem: lastKnownDiemBalance,
    totalCalls: totalCallCount,
    tier: getBudgetTier(),
  };
}

type BudgetTier = "normal" | "conservation" | "critical";

export function getBudgetTier(): BudgetTier {
  if (lastKnownBalance === null) return "normal";
  if (lastKnownBalance < 0.5) return "critical";
  if (lastKnownBalance < 2) return "conservation";
  return "normal";
}

export function resetBudgetState() {
  lastKnownBalance = null;
  lastKnownDiemBalance = null;
  lastDiemCost = null;
  totalCallCount = 0;
}
