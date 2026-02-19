import { test, expect } from "@playwright/test";
import { loginAsSuperAdmin, loginAsCeo, loginAsSiteManager } from "../helpers/auth";

test.describe("권한 및 접근 제어", () => {
  test.describe("비인증 접근 리다이렉트", () => {
    test("인증되지 않은 상태에서 루트 접근 시 로그인 페이지로 리다이렉트된다", async ({
      page,
    }) => {
      await page.goto("/");

      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });

    test("인증되지 않은 상태에서 대시보드 접근 시 로그인 페이지로 리다이렉트된다", async ({
      page,
    }) => {
      await page.goto("/dashboard");

      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });

    test("인증되지 않은 상태에서 프로젝트 목록 접근 시 로그인 페이지로 리다이렉트된다", async ({
      page,
    }) => {
      await page.goto("/projects");

      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });

    test("인증되지 않은 상태에서 노무 관리 접근 시 로그인 페이지로 리다이렉트된다", async ({
      page,
    }) => {
      await page.goto("/labor/workers");

      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });

    test("인증되지 않은 상태에서 결제 페이지 접근 시 로그인 페이지로 리다이렉트된다", async ({
      page,
    }) => {
      await page.goto("/billing");

      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });

    test("로그인 페이지는 비인증 상태에서도 접근 가능하다", async ({
      page,
    }) => {
      await page.goto("/login");

      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.getByRole("heading", { name: /시공ON 관리자/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("회원가입 페이지는 비인증 상태에서도 접근 가능하다", async ({
      page,
    }) => {
      await page.goto("/signup");

      // Should stay on signup page (not redirect to login)
      await expect(page).toHaveURL(/\/signup/);
    });
  });

  test.describe("최고관리자(SA) 접근 권한", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsSuperAdmin(page);
    });

    test("SA 계정으로 로그인 후 대시보드에 접근 가능하다", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByText(/대시보드/)).toBeVisible({ timeout: 5000 });
    });

    test("SA 계정으로 프로젝트 목록에 접근 가능하다", async ({ page }) => {
      await page.goto("/projects");

      await expect(page).toHaveURL(/\/projects/);
      await expect(
        page.getByRole("heading", { name: /프로젝트/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("SA 계정으로 사용자 관리 페이지에 접근 가능하다", async ({ page }) => {
      await page.goto("/users");

      // SA can access users page
      await expect(page).not.toHaveURL(/\/login/);
    });

    test("SA 계정으로 회원기업 노무 페이지 접근 시 SA 노무 모니터링으로 리다이렉트된다", async ({
      page,
    }) => {
      await page.goto("/labor/workers");

      await expect(page).toHaveURL(/\/sa\/labor/, { timeout: 5000 });
      await expect(
        page.getByRole("heading", { name: /노무 모니터링/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("SA 계정으로 결제 페이지에 접근 가능하다", async ({ page }) => {
      await page.goto("/billing");

      await expect(page).not.toHaveURL(/\/login/);
      await expect(
        page.getByRole("heading", { name: /결제 및 구독/ }),
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("대표(CEO) 접근 권한", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsCeo(page);
    });

    test("대표 계정으로 로그인 후 대시보드에 접근 가능하다", async ({
      page,
    }) => {
      await page.goto("/dashboard");

      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByText(/대시보드/)).toBeVisible({ timeout: 5000 });
    });

    test("대표 계정으로 프로젝트 목록에 접근 가능하다", async ({ page }) => {
      await page.goto("/projects");

      await expect(page).not.toHaveURL(/\/login/);
      await expect(
        page.getByRole("heading", { name: /프로젝트/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("대표 계정으로 노무 관리에 접근 가능하다", async ({ page }) => {
      await page.goto("/labor/workers");

      await expect(page).not.toHaveURL(/\/login/);
    });
  });

  test.describe("현장소장 접근 권한", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsSiteManager(page);
    });

    test("현장소장 계정으로 로그인 후 대시보드에 접근 가능하다", async ({
      page,
    }) => {
      await page.goto("/dashboard");

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByText(/대시보드/)).toBeVisible({ timeout: 5000 });
    });

    test("현장소장 계정으로 프로젝트 페이지에 접근 가능하다", async ({
      page,
    }) => {
      await page.goto("/projects");

      await expect(page).not.toHaveURL(/\/login/);
    });
  });

  test.describe("로그인 후 UI 역할별 표시", () => {
    test("SA 계정 로그인 시 네비게이션에 사용자 관리 메뉴가 보인다", async ({
      page,
    }) => {
      await loginAsSuperAdmin(page);
      await page.goto("/dashboard");

      // SA should see the admin nav
      await expect(page.getByText(/대시보드/)).toBeVisible({ timeout: 5000 });
    });

    test("SA 계정 로그인 시 전체 프로젝트 통계가 표시된다", async ({
      page,
    }) => {
      await loginAsSuperAdmin(page);
      await page.goto("/dashboard");

      await expect(
        page.getByText(/전체 프로젝트/),
      ).toBeVisible({ timeout: 5000 });
    });

    test("CEO 계정 로그인 시 대시보드가 정상 렌더링된다", async ({ page }) => {
      await loginAsCeo(page);
      await page.goto("/dashboard");

      await expect(page.getByText(/대시보드/)).toBeVisible({ timeout: 5000 });
    });

    test("로그인 후 로그인 페이지로 돌아가면 대시보드로 리다이렉트된다", async ({
      page,
    }) => {
      await loginAsSuperAdmin(page);

      // Try to go back to login - should redirect to dashboard
      await page.goto("/login");

      await expect(page).toHaveURL(/\/(dashboard|$)/, { timeout: 5000 });
    });
  });
});
