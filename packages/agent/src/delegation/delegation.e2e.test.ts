import { describe, it, expect } from "vitest";
import { createDelegationFromIntent } from "./compiler.js";
import { generateAuditReport } from "./audit.js";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import type { IntentParse } from "../venice/schemas.js";

describe("Delegation creation + signing (e2e)", () => {
  // Use real MetaMask Smart Accounts Kit — off-chain only, no gas
  const delegatorKey = generatePrivateKey();
  const agentKey = generatePrivateKey();
  const agentAccount = privateKeyToAccount(agentKey);

  const testIntent: IntentParse = {
    targetAllocation: { ETH: 0.6, USDC: 0.4 },
    dailyBudgetUsd: 200,
    timeWindowDays: 7,
    maxTradesPerDay: 10,
    maxSlippage: 0.005,
    driftThreshold: 0.05,
  };

  it(
    "creates and signs a delegation from intent",
    { timeout: 30000 },
    async () => {
      const result = await createDelegationFromIntent(
        testIntent,
        delegatorKey,
        agentAccount.address,
        11155111, // Sepolia
      );

      expect(result).toBeDefined();
      expect(result.delegation).toBeDefined();
      expect(result.delegation.signature).toBeDefined();
      expect(typeof result.delegation.signature).toBe("string");
      expect(result.delegation.signature).not.toBe("0x");
      expect(result.delegation.signature!.length).toBeGreaterThan(10);
      expect(result.delegatorSmartAccount).toBeDefined();
      expect(result.delegatorSmartAccount.address).toBeDefined();

      console.log("Delegation created:", {
        delegatorSmartAccount: result.delegatorSmartAccount.address,
        signature: result.delegation.signature?.slice(0, 20) + "...",
      });
    },
  );

  it(
    "generates audit report for delegation",
    { timeout: 30000 },
    async () => {
      const result = await createDelegationFromIntent(
        testIntent,
        delegatorKey,
        agentAccount.address,
        11155111,
      );

      const report = generateAuditReport(testIntent, result.delegation);

      expect(report.allows.length).toBeGreaterThan(0);
      expect(report.prevents.length).toBeGreaterThan(0);
      expect(report.worstCase).toContain("$");
      expect(report.warnings).toHaveLength(0); // safe intent, no warnings
      expect(report.formatted).toContain("ALLOWS");
      expect(report.formatted).toContain("PREVENTS");
      expect(report.formatted).toContain("WORST CASE");

      console.log("\n" + report.formatted);
    },
  );
});
