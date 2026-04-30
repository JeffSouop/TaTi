import { expect, test } from "@playwright/test";

test("home page loads smoke test", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("body")).toContainText("TaTi");
});
