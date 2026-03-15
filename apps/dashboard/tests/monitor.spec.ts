import { test, expect } from "@playwright/test";

test.describe("Monitor Screen", () => {
  test("shows not deployed state when navigated directly", async ({
    page,
  }) => {
    // Mock the agent state API to return not-running
    await page.route("**/api/state", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          running: false,
          cycle: 0,
          drift: 0,
          totalValue: 0,
          trades: 0,
          totalSpent: 0,
          budgetTier: "$0",
          allocation: {},
          target: {},
          transactions: [],
          feed: [],
        }),
      }),
    );

    await page.goto("/");

    // The monitor tab should be disabled initially since we haven't deployed
    const monitorTab = page.getByRole("tab", { name: /monitor/i });
    await expect(monitorTab).toBeDisabled();
  });

  test("deploy flow transitions to audit then monitor", async ({ page }) => {
    // Mock deploy API
    await page.route("**/api/deploy", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          parsed: {
            targetAllocation: { ETH: 0.6, USDC: 0.4 },
            dailyBudgetUsd: 200,
            timeWindowDays: 7,
            maxSlippage: 0.005,
            driftThreshold: 0.05,
            maxTradesPerDay: 10,
          },
          audit: {
            allows: ["Swap ETH ↔ USDC on Uniswap V3"],
            prevents: ["Transfer to external addresses"],
            worstCase: "Maximum daily loss: $200",
            warnings: [],
          },
        }),
      }),
    );

    // Mock state API for monitor
    await page.route("**/api/state", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          running: true,
          cycle: 3,
          drift: 0.02,
          totalValue: 1500,
          trades: 1,
          totalSpent: 45,
          budgetTier: "$200",
          allocation: { ETH: 0.58, USDC: 0.42 },
          target: { ETH: 0.6, USDC: 0.4 },
          transactions: [
            {
              txHash:
                "0xabc123def456789012345678901234567890123456789012345678901234abcd",
              sellToken: "USDC",
              buyToken: "ETH",
              sellAmount: "45.00",
              status: "confirmed",
              timestamp: new Date().toISOString(),
            },
          ],
          feed: [],
        }),
      }),
    );

    await page.goto("/");

    // Type intent and deploy
    const textarea = page.getByPlaceholder(/60\/40/);
    await textarea.fill("60/40 ETH/USDC, $200/day, 7 days");
    const deployBtn = page.getByRole("button", { name: /compile & deploy/i });
    await deployBtn.click();

    // Should transition to Audit tab
    await expect(
      page.getByText("Parsed Intent", { exact: false }),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText("Delegation Report", { exact: false }),
    ).toBeVisible();

    // Verify allocation bar shows correct percentages
    await expect(page.getByText("ETH 60%")).toBeVisible();
    await expect(page.getByText("USDC 40%")).toBeVisible();

    // Verify audit items
    await expect(
      page.getByText("Swap ETH ↔ USDC on Uniswap V3"),
    ).toBeVisible();
    await expect(
      page.getByText("Transfer to external addresses"),
    ).toBeVisible();

    // Click View Monitor
    const viewMonitor = page.getByRole("button", { name: /view monitor/i });
    await viewMonitor.click();

    // Should show monitor with stats
    await expect(page.getByText("$1,500.00")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("2.0%", { exact: true }).first()).toBeVisible(); // drift
    await expect(page.getByText("Cycle 3")).toBeVisible();
  });
});
