import { expect, test } from "@playwright/test";

test.describe("Admin UX Smoke", () => {
  test("login form should be clear and interactive", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /시공ON 관리자/ })).toBeVisible();
    await expect(page.getByLabel(/아이디/)).toBeVisible();

    const passwordInput = page.locator('input[autocomplete="current-password"]');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");

    const submitButton = page.getByRole("button", { name: /^로그인$/ });
    await expect(submitButton).toBeDisabled();

    await page.getByLabel(/아이디/).fill("superadmin");
    await passwordInput.fill("test1234");
    await expect(submitButton).toBeEnabled();

    await page.getByRole("button", { name: /비밀번호 보기/ }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("quick login actions should be visible and touch-friendly", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByText(/테스트 계정/)).toBeVisible();

    const quickButtons = page.locator("button").filter({ hasText: /(최고관리자|대표|현장소장|근로자)/ });
    await expect(quickButtons).toHaveCount(4);

    const firstButton = quickButtons.first();
    const box = await firstButton.boundingBox();
    expect(box).toBeTruthy();
    expect((box?.height ?? 0) >= 44).toBeTruthy();
  });
});
