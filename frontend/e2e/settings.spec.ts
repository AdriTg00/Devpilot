import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
  });

  test("shows settings page", async ({ page }) => {
    await expect(page.getByText("Settings")).toBeVisible({ timeout: 15000 });
  });

  test("has provider selection", async ({ page }) => {
    await expect(page.getByText("Ollama").first()).toBeVisible({ timeout: 15000 });
  });

  test("has save button", async ({ page }) => {
    await expect(page.getByText("Save Settings").first()).toBeVisible({ timeout: 15000 });
  });
});
