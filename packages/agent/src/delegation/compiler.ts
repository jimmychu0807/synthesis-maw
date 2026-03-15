import type { Address, Hex } from "viem";
import { encodePacked } from "viem";
import {
  createDelegation,
  signDelegation,
  getSmartAccountsEnvironment,
  type Delegation,
} from "@metamask/smart-accounts-kit";
import { reasoningLlm } from "../venice/llm.js";
import {
  IntentParseLlmSchema,
  IntentParseSchema,
  type IntentParse,
} from "../venice/schemas.js";
import { CONTRACTS } from "../config.js";

// ---------------------------------------------------------------------------
// Adversarial intent detection
// ---------------------------------------------------------------------------

export interface AdversarialWarning {
  field: string;
  value: number;
  threshold: number;
  message: string;
}

export function detectAdversarialIntent(
  intent: IntentParse,
): AdversarialWarning[] {
  const warnings: AdversarialWarning[] = [];

  if (intent.dailyBudgetUsd > 1000) {
    warnings.push({
      field: "dailyBudgetUsd",
      value: intent.dailyBudgetUsd,
      threshold: 1000,
      message: `Daily budget $${intent.dailyBudgetUsd} exceeds $1,000 safety threshold`,
    });
  }

  if (intent.timeWindowDays > 30) {
    warnings.push({
      field: "timeWindowDays",
      value: intent.timeWindowDays,
      threshold: 30,
      message: `Time window ${intent.timeWindowDays} days exceeds 30-day safety threshold`,
    });
  }

  if (intent.maxSlippage > 0.02) {
    warnings.push({
      field: "maxSlippage",
      value: intent.maxSlippage,
      threshold: 0.02,
      message: `Max slippage ${(intent.maxSlippage * 100).toFixed(1)}% exceeds 2% safety threshold`,
    });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// compileIntent — parse natural language into IntentParse via Venice LLM
// ---------------------------------------------------------------------------

export async function compileIntent(intentText: string): Promise<IntentParse> {
  // Use the LLM-specific schema with explicit array for targetAllocation.
  // Venice/Gemini drops dynamic keys from z.record() in function calling mode
  // because Zod 4 emits `propertyNames` which isn't supported.
  const structuredLlm = reasoningLlm.withStructuredOutput(
    IntentParseLlmSchema,
    { method: "functionCalling" },
  );

  const raw = await structuredLlm.invoke([
    {
      role: "system",
      content: `You are a DeFi intent parser. Given a natural language description of a portfolio rebalancing strategy, extract the structured parameters.

Rules:
- targetAllocation is an array of { token, percentage } pairs that must sum to approximately 1.0
- dailyBudgetUsd is the maximum USD value of trades per day
- timeWindowDays is how many days the delegation should last
- maxTradesPerDay is how many trades per day are allowed (default 10 if not specified)
- maxSlippage is expressed as a decimal (e.g., 0.5% = 0.005). Default to 0.005 if not specified.
- driftThreshold is expressed as a decimal (e.g., 5% = 0.05). Default to 0.05 if not specified.`,
    },
    { role: "user", content: intentText },
  ]);

  // Convert array-format allocation to Record for downstream consumption
  const allocation: Record<string, number> = {};
  for (const entry of raw.targetAllocation) {
    allocation[entry.token.toUpperCase()] = entry.percentage;
  }

  const intent: IntentParse = {
    targetAllocation: allocation,
    dailyBudgetUsd: raw.dailyBudgetUsd,
    timeWindowDays: raw.timeWindowDays,
    maxTradesPerDay: raw.maxTradesPerDay,
    maxSlippage: raw.maxSlippage,
    driftThreshold: raw.driftThreshold,
  };

  // Post-validate with the canonical schema
  const validated = IntentParseSchema.safeParse(intent);
  if (!validated.success) {
    throw new Error(
      `LLM output failed schema validation: ${validated.error.message}`,
    );
  }

  return validated.data;
}

// ---------------------------------------------------------------------------
// Token address resolver
// ---------------------------------------------------------------------------

const TOKEN_ADDRESSES: Record<string, { sepolia: Address; base: Address }> = {
  ETH: {
    sepolia: CONTRACTS.WETH_SEPOLIA,
    base: CONTRACTS.WETH_BASE,
  },
  WETH: {
    sepolia: CONTRACTS.WETH_SEPOLIA,
    base: CONTRACTS.WETH_BASE,
  },
  USDC: {
    sepolia: CONTRACTS.USDC_SEPOLIA,
    base: CONTRACTS.USDC_BASE,
  },
};

function resolveTokenAddress(
  symbol: string,
  chainId: number,
): Address | undefined {
  const entry = TOKEN_ADDRESSES[symbol.toUpperCase()];
  if (!entry) return undefined;
  // Ethereum Sepolia = 11155111, Base = 8453, Base Sepolia = 84532
  if (chainId === 11155111 || chainId === 84532) return entry.sepolia;
  if (chainId === 8453) return entry.base;
  return undefined;
}

// ---------------------------------------------------------------------------
// createDelegationFromIntent — compile an IntentParse into a signed delegation
// ---------------------------------------------------------------------------

export async function createDelegationFromIntent(
  intent: IntentParse,
  delegatorKey: `0x${string}`,
  agentAddress: Address,
  chainId: number,
): Promise<Delegation> {
  const environment = getSmartAccountsEnvironment(chainId);

  // Timestamp caveat: delegation expires after timeWindowDays
  const expiryTimestamp = BigInt(
    Math.floor(Date.now() / 1000) + intent.timeWindowDays * 86400,
  );

  // Limited calls caveat: max trades per day * days
  const totalCalls = BigInt(intent.maxTradesPerDay * intent.timeWindowDays);

  // Build caveats using resolved enforcer addresses from the environment
  const caveats = [
    {
      enforcer: environment.caveatEnforcers.TimestampEnforcer as Address,
      terms: encodePacked(
        ["uint128", "uint128"],
        [0n, expiryTimestamp],
      ),
      args: "0x" as Hex,
    },
    {
      enforcer: environment.caveatEnforcers.LimitedCallsEnforcer as Address,
      terms: encodePacked(["uint256"], [totalCalls]),
      args: "0x" as Hex,
    },
  ];

  // Determine the primary ERC-20 token to constrain
  const tokens = Object.keys(intent.targetAllocation);
  const primaryToken =
    tokens.find((t) => t.toUpperCase() !== "USDC") ?? tokens[0]!;
  const tokenAddress = resolveTokenAddress(primaryToken, chainId);

  // Calculate max amount: dailyBudgetUsd * timeWindowDays (in USDC decimals: 6)
  const maxAmountRaw = BigInt(
    Math.ceil(intent.dailyBudgetUsd * intent.timeWindowDays * 1e6),
  );

  // Choose scope based on whether we have a known token
  const scopeTokenAddress = tokenAddress ?? CONTRACTS.USDC_SEPOLIA;
  const scope = {
    type: "erc20TransferAmount" as const,
    tokenAddress: scopeTokenAddress,
    maxAmount: maxAmountRaw,
  };

  const { privateKeyToAccount } = await import("viem/accounts");
  const delegatorAccount = privateKeyToAccount(delegatorKey);

  const delegation = createDelegation({
    from: delegatorAccount.address as Hex,
    to: agentAddress as Hex,
    environment,
    scope,
    caveats,
  });

  // Sign the delegation (async — returns Promise<Hex>)
  const signature = await signDelegation({
    privateKey: delegatorKey,
    delegation,
    delegationManager: CONTRACTS.DELEGATION_MANAGER,
    chainId,
  });

  return {
    ...delegation,
    signature,
  };
}
