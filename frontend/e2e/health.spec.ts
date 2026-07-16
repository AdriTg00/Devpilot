import { test, expect } from "@playwright/test";

test.describe("Health Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/health");
  });

  test("shows health dashboard", async ({ page }) => {
    await expect(page.getByText("Health Dashboard")).toBeVisible({ timeout: 15000 });
  });

  test("displays backend status sections", async ({ page }) => {
    await expect(page.getByText("Ollama").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("RAG (ChromaDB)").first()).toBeVisible({ timeout: 15000 });
  });

  test("shows provider and model info", async ({ page }) => {
    await expect(page.getByText("Provider").first()).toBeVisible({ timeout: 15000 });
  });
});
