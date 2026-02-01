import { test, expect } from "@playwright/test";

test.describe("Mobile Projects Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/이메일/).fill("admin@sigongon.test");
    await page.getByPlaceholder(/비밀번호/).fill("admin123!");
    await page.getByRole("button", { name: /로그인/ }).click();
    await expect(page).toHaveURL("/");
  });

  test("should show project list", async ({ page }) => {
    await page.goto("/projects");

    await expect(page.getByText(/프로젝트/)).toBeVisible();
  });

  test("should navigate to create project", async ({ page }) => {
    await page.goto("/projects");

    await page
      .getByRole("link", { name: /새 프로젝트/ })
      .first()
      .click();

    await expect(page).toHaveURL("/projects/new");
  });

  test("should create a new project", async ({ page }) => {
    await page.goto("/projects/new");

    const timestamp = Date.now();
    await page.getByLabel(/프로젝트명/).fill(`테스트 현장 ${timestamp}`);
    await page.getByLabel(/현장 주소/).fill("서울시 강남구 테헤란로 123");
    await page.getByLabel(/발주처/).fill("테스트 고객");
    await page.getByLabel(/연락처/).fill("010-1234-5678");

    await page.getByRole("button", { name: /저장|만들기/ }).click();

    await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+$/);
  });
});
