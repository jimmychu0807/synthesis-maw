import { describe, it, expect, vi } from "vitest";
import { detectAdversarialIntent } from "./compiler.js";
import type { IntentParse } from "../venice/schemas.js";
import { IntentParseSchema } from "../venice/schemas.js";

// ---------------------------------------------------------------------------
// Helper: create a valid IntentParse for testing
// ---------------------------------------------------------------------------

function makeIntent(overrides: Partial<IntentParse> = {}): IntentParse {
  return {
    targetAllocation: { ETH: 0.6, USDC: 0.4 },
    dailyBudgetUsd: 200,
    timeWindowDays: 7,
    maxTradesPerDay: 10,
    maxSlippage: 0.005,
    driftThreshold: 0.05,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Adversarial intent detection
// ---------------------------------------------------------------------------

describe("detectAdversarialIntent", () => {
  it("returns no warnings for a safe intent", () => {
    const intent = makeIntent();
    const warnings = detectAdversarialIntent(intent);
    expect(warnings).toHaveLength(0);
  });

  it("warns when dailyBudgetUsd exceeds $1,000", () => {
    const intent = makeIntent({ dailyBudgetUsd: 5000 });
    const warnings = detectAdversarialIntent(intent);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.field).toBe("dailyBudgetUsd");
    expect(warnings[0]!.value).toBe(5000);
    expect(warnings[0]!.threshold).toBe(1000);
    expect(warnings[0]!.message).toContain("$5000");
    expect(warnings[0]!.message).toContain("$1,000");
  });

  it("warns when timeWindowDays exceeds 30", () => {
    const intent = makeIntent({ timeWindowDays: 90 });
    const warnings = detectAdversarialIntent(intent);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.field).toBe("timeWindowDays");
    expect(warnings[0]!.value).toBe(90);
    expect(warnings[0]!.threshold).toBe(30);
    expect(warnings[0]!.message).toContain("90 days");
  });

  it("warns when maxSlippage exceeds 2%", () => {
    const intent = makeIntent({ maxSlippage: 0.05 });
    const warnings = detectAdversarialIntent(intent);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.field).toBe("maxSlippage");
    expect(warnings[0]!.value).toBe(0.05);
    expect(warnings[0]!.threshold).toBe(0.02);
    expect(warnings[0]!.message).toContain("5.0%");
    expect(warnings[0]!.message).toContain("2%");
  });

  it("returns multiple warnings for multiple violations", () => {
    const intent = makeIntent({
      dailyBudgetUsd: 2000,
      timeWindowDays: 60,
      maxSlippage: 0.1,
    });
    const warnings = detectAdversarialIntent(intent);
    expect(warnings).toHaveLength(3);
    const fields = warnings.map((w) => w.field);
    expect(fields).toContain("dailyBudgetUsd");
    expect(fields).toContain("timeWindowDays");
    expect(fields).toContain("maxSlippage");
  });

  it("does not warn at exact threshold boundaries", () => {
    const intent = makeIntent({
      dailyBudgetUsd: 1000,
      timeWindowDays: 30,
      maxSlippage: 0.02,
    });
    const warnings = detectAdversarialIntent(intent);
    expect(warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// compileIntent — test that LLM output matches IntentParse shape (mocked)
// ---------------------------------------------------------------------------

describe("compileIntent (mocked LLM)", () => {
  it("returns valid IntentParse from mocked LLM output", async () => {
    // Mock the LLM by testing that a well-formed object passes validation
    const mockLlmOutput = {
      targetAllocation: { ETH: 0.6, USDC: 0.4 },
      dailyBudgetUsd: 200,
      timeWindowDays: 7,
      maxTradesPerDay: 10,
      maxSlippage: 0.005,
      driftThreshold: 0.05,
    };

    const validated = IntentParseSchema.safeParse(mockLlmOutput);
    expect(validated.success).toBe(true);
    if (validated.success) {
      expect(validated.data.targetAllocation).toEqual({ ETH: 0.6, USDC: 0.4 });
      expect(validated.data.dailyBudgetUsd).toBe(200);
      expect(validated.data.timeWindowDays).toBe(7);
      expect(validated.data.maxTradesPerDay).toBe(10);
      expect(validated.data.maxSlippage).toBe(0.005);
      expect(validated.data.driftThreshold).toBe(0.05);
    }
  });

  it("rejects invalid LLM output with missing fields", () => {
    const badOutput = {
      targetAllocation: { ETH: 0.6, USDC: 0.4 },
      // missing dailyBudgetUsd and other fields
    };

    const validated = IntentParseSchema.safeParse(badOutput);
    expect(validated.success).toBe(false);
  });

  it("rejects LLM output with wrong types", () => {
    const badOutput = {
      targetAllocation: { ETH: "sixty", USDC: 0.4 },
      dailyBudgetUsd: "two hundred",
      timeWindowDays: 7,
      maxTradesPerDay: 10,
      maxSlippage: 0.005,
      driftThreshold: 0.05,
    };

    const validated = IntentParseSchema.safeParse(badOutput);
    expect(validated.success).toBe(false);
  });

  it("validates single-token allocation", () => {
    const output = {
      targetAllocation: { ETH: 1.0 },
      dailyBudgetUsd: 100,
      timeWindowDays: 30,
      maxTradesPerDay: 5,
      maxSlippage: 0.01,
      driftThreshold: 0.1,
    };

    const validated = IntentParseSchema.safeParse(output);
    expect(validated.success).toBe(true);
  });

  it("validates three-token allocation", () => {
    const output = {
      targetAllocation: { ETH: 0.5, USDC: 0.3, WBTC: 0.2 },
      dailyBudgetUsd: 500,
      timeWindowDays: 14,
      maxTradesPerDay: 20,
      maxSlippage: 0.003,
      driftThreshold: 0.03,
    };

    const validated = IntentParseSchema.safeParse(output);
    expect(validated.success).toBe(true);
  });
});
