import { test, expect } from "@playwright/test";

test.describe("회원가입 플로우", () => {
  test("회원가입 페이지 접근 시 기본 폼이 렌더링된다", async ({ page }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", { name: /기본 정보 입력/ }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("회원가입 페이지에 필수 입력 필드가 존재한다", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByLabel(/아이디/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel(/비밀번호/)).toBeVisible();
    await expect(page.getByLabel(/비밀번호 확인/)).toBeVisible();
    await expect(page.getByLabel(/휴대폰 번호/)).toBeVisible();
  });

  test("스텝퍼(단계 표시)가 회원가입 페이지에 표시된다", async ({ page }) => {
    await page.goto("/signup");

    // Stepper component should be visible
    const stepper = page.locator(".mb-8").first();
    await expect(stepper).toBeVisible({ timeout: 5000 });
  });

  test("아이디 중복확인 버튼이 존재한다", async ({ page }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("button", { name: /중복확인/ }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("빈 폼으로 다음 버튼 클릭 시 유효성 오류가 표시된다", async ({
    page,
  }) => {
    await page.goto("/signup");

    await page.getByRole("button", { name: /다음/ }).click();

    // At least one validation error should appear
    const errorMessages = page.locator(".text-red-600, .text-sm.text-red-");
    await expect(errorMessages.first()).toBeVisible({ timeout: 3000 });
  });

  test("서비스 이용약관 동의 체크박스가 존재한다", async ({ page }) => {
    await page.goto("/signup");

    await expect(
      page.getByText(/서비스 이용약관 동의/),
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.getByText(/개인정보 처리방침 동의/),
    ).toBeVisible();
  });

  test("로그인 페이지에서 회원가입 링크를 클릭하면 signup 페이지로 이동한다", async ({
    page,
  }) => {
    await page.goto("/login");

    const signupLink = page.getByRole("link", { name: /회원가입/ });
    await expect(signupLink).toBeVisible({ timeout: 5000 });
    await signupLink.click();

    await expect(page).toHaveURL(/\/signup/, { timeout: 5000 });
  });

  test("회원가입 페이지에서 취소 버튼을 누르면 로그인 페이지로 이동한다", async ({
    page,
  }) => {
    await page.goto("/signup");

    await page.getByRole("link", { name: /취소/ }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("회원가입 페이지에서 이미 계정이 있으신가요 로그인 링크가 보인다", async ({
    page,
  }) => {
    await page.goto("/signup");

    await expect(
      page.getByText(/이미 계정이 있으신가요/),
    ).toBeVisible({ timeout: 5000 });

    const loginLink = page.getByRole("link", { name: /로그인/ });
    await expect(loginLink).toBeVisible();
  });

  test("아이디 필드에 짧은 값을 입력하고 중복확인 시 오류가 표시된다", async ({
    page,
  }) => {
    await page.goto("/signup");

    await page.getByLabel(/아이디/).fill("ab");
    await page.getByRole("button", { name: /중복확인/ }).click();

    await expect(
      page.getByText(/4-20자|영문으로 시작/),
    ).toBeVisible({ timeout: 3000 });
  });

  test("이메일 선택 필드가 존재한다", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByLabel(/이메일/)).toBeVisible({ timeout: 5000 });
  });

  test("휴대폰 인증번호 발송 버튼이 존재한다", async ({ page }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("button", { name: /인증번호/ }),
    ).toBeVisible({ timeout: 5000 });
  });
});
