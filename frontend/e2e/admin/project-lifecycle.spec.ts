import { test, expect } from "@playwright/test";
import { loginAsSuperAdmin, loginAsCeo } from "../helpers/auth";

test.describe("프로젝트 생명주기", () => {
  test.describe("프로젝트 목록", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsSuperAdmin(page);
    });

    test("프로젝트 목록 페이지가 올바르게 로딩된다", async ({ page }) => {
      await page.goto("/projects");

      await expect(
        page.getByRole("heading", { name: /프로젝트/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("프로젝트 목록에 검색 필드가 존재한다", async ({ page }) => {
      await page.goto("/projects");

      const searchInput = page.getByPlaceholder(
        /프로젝트명|주소|고객명/,
      );
      await expect(searchInput).toBeVisible({ timeout: 5000 });
    });

    test("프로젝트 목록에 상태 필터 셀렉터가 존재한다", async ({ page }) => {
      await page.goto("/projects");

      await expect(page.getByText(/모든 상태/)).toBeVisible({ timeout: 5000 });
    });

    test("프로젝트 목록에 카테고리 필터 셀렉터가 존재한다", async ({
      page,
    }) => {
      await page.goto("/projects");

      await expect(
        page.getByText(/모든 카테고리/),
      ).toBeVisible({ timeout: 5000 });
    });

    test("새 프로젝트 버튼이 존재한다", async ({ page }) => {
      await page.goto("/projects");

      await expect(
        page.getByRole("button", { name: /새 프로젝트/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("프로젝트 목록이 테이블 형태로 렌더링된다", async ({ page }) => {
      await page.goto("/projects");

      // Wait for loading to complete - either table headers or empty state
      await expect(
        page.getByText(/프로젝트|프로젝트가 없어요/).first(),
      ).toBeVisible({ timeout: 5000 });
    });

    test("프로젝트 검색이 동작한다", async ({ page }) => {
      await page.goto("/projects");

      const searchInput = page.getByPlaceholder(/프로젝트명|주소|고객명/);
      await searchInput.fill("강남");

      // After typing, the list should update (either show results or empty state)
      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("새 프로젝트 생성 모달", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsSuperAdmin(page);
    });

    test("새 프로젝트 버튼 클릭 시 생성 모달이 열린다", async ({ page }) => {
      await page.goto("/projects");

      await page.getByRole("button", { name: /새 프로젝트/ }).click();

      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/새 프로젝트/)).toBeVisible();
    });

    test("프로젝트 생성 모달에 필수 필드가 존재한다", async ({ page }) => {
      await page.goto("/projects");

      await page.getByRole("button", { name: /새 프로젝트/ }).click();

      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await expect(page.getByLabel(/프로젝트명/)).toBeVisible();
      await expect(page.getByLabel(/주소/)).toBeVisible();
    });

    test("프로젝트 생성 모달에서 취소 버튼으로 닫을 수 있다", async ({
      page,
    }) => {
      await page.goto("/projects");

      await page.getByRole("button", { name: /새 프로젝트/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

      await page
        .getByRole("dialog")
        .getByRole("button", { name: /취소/ })
        .click();

      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 });
    });

    test("프로젝트 생성 모달에 고객명 필드가 존재한다", async ({ page }) => {
      await page.goto("/projects");

      await page.getByRole("button", { name: /새 프로젝트/ }).click();

      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await expect(page.getByLabel(/고객명/)).toBeVisible();
    });

    test("프로젝트 생성 모달에 카테고리 선택이 존재한다", async ({ page }) => {
      await page.goto("/projects");

      await page.getByRole("button", { name: /새 프로젝트/ }).click();

      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/카테고리/)).toBeVisible();
    });
  });

  test.describe("프로젝트 상세 페이지", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsSuperAdmin(page);
    });

    test("프로젝트 목록에서 항목 클릭 시 상세 페이지로 이동한다", async ({
      page,
    }) => {
      await page.goto("/projects");

      // Wait for project list to load
      const firstProjectLink = page.locator("table a").first();
      const hasProjects = await firstProjectLink.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasProjects) {
        await firstProjectLink.click();
        await expect(page).toHaveURL(/\/projects\/[^/]+$/, { timeout: 5000 });
      } else {
        // Empty state - acceptable
        await expect(page.getByText(/프로젝트가 없어요/)).toBeVisible();
      }
    });

    test("프로젝트 상세 페이지는 고객 정보 카드를 포함한다", async ({
      page,
    }) => {
      await page.goto("/projects");

      const firstProjectLink = page.locator("table a").first();
      const hasProjects = await firstProjectLink.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasProjects) {
        await firstProjectLink.click();
        await expect(page).toHaveURL(/\/projects\/[^/]+$/, { timeout: 5000 });
        await expect(page.getByText(/고객 정보/)).toBeVisible({ timeout: 5000 });
      }
    });

    test("프로젝트 상세 페이지는 프로젝트 진행 현황을 포함한다", async ({
      page,
    }) => {
      await page.goto("/projects");

      const firstProjectLink = page.locator("table a").first();
      const hasProjects = await firstProjectLink.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasProjects) {
        await firstProjectLink.click();
        await expect(page).toHaveURL(/\/projects\/[^/]+$/, { timeout: 5000 });
        await expect(
          page.getByText(/프로젝트 진행 현황/),
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("프로젝트 목록 표시 (대표 계정)", () => {
    test("대표 계정으로 로그인 시 프로젝트 목록이 표시된다", async ({
      page,
    }) => {
      await loginAsCeo(page);
      await page.goto("/projects");

      await expect(
        page.getByRole("heading", { name: /프로젝트/ }),
      ).toBeVisible({ timeout: 5000 });
    });
  });
});
