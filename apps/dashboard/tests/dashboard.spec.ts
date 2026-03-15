import { test, expect } from "@playwright/test";

test.describe("Dashboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has correct page title", async ({ page }) => {
    await expect(page).toHaveTitle(/Veil/);
  });

  test("shows three tabs", async ({ page }) => {
    await expect(
      page.getByRole("tab", { name: /configure/i }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /audit/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /monitor/i })).toBeVisible();
  });

  test("audit and monitor tabs disabled before deploy", async ({ page }) => {
    const auditTab = page.getByRole("tab", { name: /audit/i });
    const monitorTab = page.getByRole("tab", { name: /monitor/i });
    await expect(auditTab).toBeDisabled();
    await expect(monitorTab).toBeDisabled();
  });

  test("footer shows sponsor links", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Venice" })).toBeVisible();
    await expect(page.getByRole("link", { name: "MetaMask" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Uniswap" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Protocol Labs" }),
    ).toBeVisible();
  });

  test("footer links open in new tab", async ({ page }) => {
    const veniceLink = page.getByRole("link", { name: "Venice" });
    await expect(veniceLink).toHaveAttribute("target", "_blank");
    await expect(veniceLink).toHaveAttribute("rel", /noopener/);
  });
});
