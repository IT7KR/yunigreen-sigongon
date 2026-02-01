import { test, expect } from "@playwright/test";

test.describe("Mobile Authentication", () => {
  test("should show login page when not authenticated", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /로그인/ })).toBeVisible();
  });

  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder(/이메일/).fill("admin@sigongon.test");
    await page.getByPlaceholder(/비밀번호/).fill("admin123!");
    await page.getByRole("button", { name: /로그인/ }).click();

    await expect(page).toHaveURL("/");
  });
});
