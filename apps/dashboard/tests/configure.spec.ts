import { test, expect } from "@playwright/test";

test.describe("Configure Screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads with Configure tab active", async ({ page }) => {
    const configureTab = page.getByRole("tab", { name: /configure/i });
    await expect(configureTab).toHaveAttribute("aria-selected", "true");
  });

  test("shows VEIL wordmark", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "VEIL" })).toBeVisible();
  });

  test("textarea accepts input", async ({ page }) => {
    const textarea = page.getByPlaceholder(/60\/40/);
    await textarea.fill("70/30 ETH/USDC, $100/day, 14 days");
    await expect(textarea).toHaveValue("70/30 ETH/USDC, $100/day, 14 days");
  });

  test("deploy button disabled when textarea empty", async ({ page }) => {
    const deployBtn = page.getByRole("button", { name: /compile & deploy/i });
    await expect(deployBtn).toBeDisabled();
  });

  test("deploy button enabled when textarea has text", async ({ page }) => {
    const textarea = page.getByPlaceholder(/60\/40/);
    await textarea.fill("60/40 ETH/USDC");
    const deployBtn = page.getByRole("button", { name: /compile & deploy/i });
    await expect(deployBtn).toBeEnabled();
  });

  test("preset buttons fill textarea", async ({ page }) => {
    const preset = page.getByRole("button", {
      name: /60\/40 ETH\/USDC, \$200\/day, 7 days/,
    });
    await preset.click();
    const textarea = page.getByPlaceholder(/60\/40/);
    await expect(textarea).toHaveValue("60/40 ETH/USDC, $200/day, 7 days");
  });

  test("all three preset buttons are visible", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /60\/40 ETH\/USDC, \$200\/day/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /80\/20 ETH\/USDC/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /50\/50 split/ }),
    ).toBeVisible();
  });
});
