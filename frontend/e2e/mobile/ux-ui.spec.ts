import { expect, test } from "@playwright/test";

test.describe("Mobile UX Smoke", () => {
  test("login page should present clear hierarchy and disabled CTA by default", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /^시공ON$/ })).toBeVisible();
    await expect(page.getByText(/초대받은 계정으로 로그인하세요/)).toBeVisible();

    const emailInput = page.getByLabel(/이메일/);
    const passwordInput = page.locator('input[autocomplete="current-password"]');
    const submitButton = page.getByRole("button", { name: /^로그인$/ });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(submitButton).toBeDisabled();

    await emailInput.fill("admin@sigongon.test");
    await passwordInput.fill("admin123!");
    await expect(submitButton).toBeEnabled();
  });

  test("password visibility toggle should work on mobile", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.locator('input[autocomplete="current-password"]');
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: /비밀번호 보기/ }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");
  });
});
