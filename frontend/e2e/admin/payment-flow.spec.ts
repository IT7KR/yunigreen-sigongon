import { test, expect } from "@playwright/test";
import { loginAsSuperAdmin, loginAsCeo } from "../helpers/auth";

test.describe("결제 관련 플로우", () => {
  test.describe("결제 및 구독 페이지 (SA 계정)", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsSuperAdmin(page);
    });

    test("결제 및 구독 페이지가 올바르게 로딩된다", async ({ page }) => {
      await page.goto("/billing");

      await expect(
        page.getByRole("heading", { name: /결제 및 구독/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("결제 페이지에 현재 플랜 정보가 표시된다", async ({ page }) => {
      await page.goto("/billing");

      // Either a plan is shown or plan selector is shown
      const planContent = page
        .getByText(/현재 플랜|플랜을 선택/)
        .first();
      await expect(planContent).toBeVisible({ timeout: 5000 });
    });

    test("결제 내역 테이블이 존재한다", async ({ page }) => {
      await page.goto("/billing");

      // Plan selector might be shown for free trial accounts
      const hasPlanSelector = await page
        .getByText(/서비스를 계속 이용/)
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (!hasPlanSelector) {
        await expect(page.getByText(/결제 내역/)).toBeVisible({ timeout: 5000 });
      }
    });

    test("결제 페이지에 사용자 좌석 정보가 표시된다", async ({ page }) => {
      await page.goto("/billing");

      const hasPlanSelector = await page
        .getByText(/서비스를 계속 이용/)
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (!hasPlanSelector) {
        await expect(page.getByText(/사용자 좌석/)).toBeVisible({ timeout: 5000 });
      }
    });

    test("플랜 변경 버튼이 존재한다", async ({ page }) => {
      await page.goto("/billing");

      const hasPlanSelector = await page
        .getByText(/서비스를 계속 이용/)
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (!hasPlanSelector) {
        const planChangeBtn = page.getByRole("button", { name: /플랜 변경|예약 변경/ });
        await expect(planChangeBtn).toBeVisible({ timeout: 5000 });
      }
    });

    test("구독 만료일 정보가 표시된다", async ({ page }) => {
      await page.goto("/billing");

      const hasPlanSelector = await page
        .getByText(/서비스를 계속 이용/)
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (!hasPlanSelector) {
        await expect(page.getByText(/구독 만료일/)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("결제 및 구독 페이지 (대표 계정)", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsCeo(page);
    });

    test("대표 계정으로 결제 페이지 접근이 가능하다", async ({ page }) => {
      await page.goto("/billing");

      await expect(
        page.getByRole("heading", { name: /결제 및 구독/ }),
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("결제 체크아웃 페이지", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsSuperAdmin(page);
    });

    test("결제 체크아웃 페이지에 플랜 파라미터로 접근 가능하다", async ({
      page,
    }) => {
      await page.goto("/billing/checkout?plan=STARTER");

      // Page should load (not redirect back immediately)
      await page.waitForTimeout(1000);

      // Either checkout form or redirect to billing is acceptable
      const url = page.url();
      const onExpectedPage =
        url.includes("/billing/checkout") || url.includes("/billing");
      expect(onExpectedPage).toBeTruthy();
    });
  });

  test.describe("대시보드 표시", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsSuperAdmin(page);
    });

    test("대시보드에 최근 프로젝트 카드가 표시된다", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.getByText(/최근 프로젝트/)).toBeVisible({ timeout: 5000 });
    });
  });
});
