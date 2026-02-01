import { test, expect } from "@playwright/test";

test.describe("Admin Authentication", () => {
  test("should show login page when not authenticated", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /로그인/ })).toBeVisible();
  });

  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/아이디/).fill("superadmin");
    await page.getByLabel(/비밀번호/).fill("admin123!");
    await page.getByRole("button", { name: /로그인/ }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(/대시보드/)).toBeVisible();
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel(/아이디/).fill("wronguser");
    await page.getByLabel(/비밀번호/).fill("wrongpassword");
    await page.getByRole("button", { name: /로그인/ }).click();

    await expect(
      page.getByText(/아이디 또는 비밀번호가 올바르지 않아요/),
    ).toBeVisible();
  });
});
