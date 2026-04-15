/**
 * Unit tests for portfolio balance fetching and allocation calculation.
 *
 * @module @maw/agent/data/portfolio.test
 */
import { createPublicClient, type Address } from "viem";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPortfolioBalance } from "../portfolio.js";

// Mock viem before importing the module under test
vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getBalance: vi.fn(),
      readContract: vi.fn(),
    })),
  };
});

/** Deterministic key for unit tests only — must not be a funded production wallet. */
const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const; // well-known test key, no real funds

describe("getPortfolioBalance", () => {
  const testAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as Address;
  const ethPriceUsd = 2000;

  let mockGetBalance: ReturnType<typeof vi.fn>;
  let mockReadContract: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBalance = vi.fn();
    mockReadContract = vi.fn();
    vi.mocked(createPublicClient).mockReturnValue({
      getBalance: mockGetBalance,
      readContract: mockReadContract,
    } as any);
  });

  it("should return correct shape with non-zero balances", async () => {
    // 1 ETH = 1e18 wei, 500 USDC = 500e6
    mockGetBalance.mockResolvedValue(1_000_000_000_000_000_000n);
    mockReadContract.mockResolvedValue(500_000_000n);

    const result = await getPortfolioBalance(testAddress, "sepolia", ethPriceUsd);

    expect(result.address).toBe(testAddress);
    expect(result.balances.ETH).toBeDefined();
    expect(result.balances.USDC).toBeDefined();
    expect(result.balances.ETH.raw).toBe(1_000_000_000_000_000_000n);
    expect(result.balances.USDC.raw).toBe(500_000_000n);
    expect(result.balances.ETH.formatted).toBe("1");
    expect(result.balances.USDC.formatted).toBe("500");
    expect(result.balances.ETH.usdValue).toBe(2000);
    expect(result.balances.USDC.usdValue).toBe(500);
    expect(result.totalUsdValue).toBe(2500);
    expect(result.allocation.ETH).toBeCloseTo(0.8, 5);
    expect(result.allocation.USDC).toBeCloseTo(0.2, 5);
    expect(typeof result.timestamp).toBe("number");
  });

  it("should handle zero balances", async () => {
    mockGetBalance.mockResolvedValue(0n);
    mockReadContract.mockResolvedValue(0n);

    const result = await getPortfolioBalance(testAddress, "sepolia", ethPriceUsd);

    expect(result.balances.ETH.raw).toBe(0n);
    expect(result.balances.USDC.raw).toBe(0n);
    expect(result.balances.ETH.formatted).toBe("0");
    expect(result.balances.USDC.formatted).toBe("0");
    expect(result.balances.ETH.usdValue).toBe(0);
    expect(result.balances.USDC.usdValue).toBe(0);
    expect(result.totalUsdValue).toBe(0);
    expect(result.allocation.ETH).toBe(0);
    expect(result.allocation.USDC).toBe(0);
  });

  it("should return allocation percentages that sum to 1", async () => {
    // 0.5 ETH, 1000 USDC
    mockGetBalance.mockResolvedValue(500_000_000_000_000_000n);
    mockReadContract.mockResolvedValue(1_000_000_000n);

    const result = await getPortfolioBalance(testAddress, "sepolia", ethPriceUsd);

    const totalAllocation = result.allocation.ETH + result.allocation.USDC;
    expect(totalAllocation).toBeCloseTo(1, 10);
  });
});
