import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("navigates between pages", async ({ page }) => {
    await page.goto("/");

    // Should redirect to /project
    await expect(page).toHaveURL(/\/project/);

    // Navigate to chat
    await page.getByText("Chat").first().click();
    await expect(page).toHaveURL(/\/chat/);

    // Navigate to settings
    await page.getByText("Settings").first().click();
    await expect(page).toHaveURL(/\/settings/);

    // Navigate to health
    await page.getByText("Health").first().click();
    await expect(page).toHaveURL(/\/health/);
  });
});
