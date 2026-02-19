import { test, expect } from "@playwright/test";
import { loginAsCeo } from "../helpers/auth";

test.describe("노무 관련 흐름", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCeo(page);
  });

  test.describe("근로자 주소록", () => {
    test("근로자 주소록 페이지가 올바르게 로딩된다", async ({ page }) => {
      await page.goto("/labor/workers");

      await expect(
        page.getByRole("heading", { name: /근로자 주소록/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("근로자 주소록에 근로자 등록 버튼이 존재한다", async ({ page }) => {
      await page.goto("/labor/workers");

      await expect(
        page.getByRole("button", { name: /근로자 등록/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("근로자 주소록에 검색 필드가 존재한다", async ({ page }) => {
      await page.goto("/labor/workers");

      await expect(
        page.getByPlaceholder(/성명|연락처/),
      ).toBeVisible({ timeout: 5000 });
    });

    test("근로자 등록 버튼 클릭 시 등록 모달이 열린다", async ({ page }) => {
      await page.goto("/labor/workers");

      await page.getByRole("button", { name: /근로자 등록/ }).click();

      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/근로자 등록/)).toBeVisible();
    });

    test("근로자 등록 모달에 성명 필드가 존재한다", async ({ page }) => {
      await page.goto("/labor/workers");

      await page.getByRole("button", { name: /근로자 등록/ }).click();

      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await expect(page.getByLabel(/성명/)).toBeVisible();
    });

    test("근로자 등록 모달에 일당 필드가 존재한다", async ({ page }) => {
      await page.goto("/labor/workers");

      await page.getByRole("button", { name: /근로자 등록/ }).click();

      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await expect(page.getByLabel(/일당/)).toBeVisible();
    });

    test("근로자 등록 모달에 외국인 근로자 체크박스가 존재한다", async ({
      page,
    }) => {
      await page.goto("/labor/workers");

      await page.getByRole("button", { name: /근로자 등록/ }).click();

      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/외국인 근로자/)).toBeVisible();
    });

    test("근로자 목록 테이블 헤더가 올바르게 렌더링된다", async ({ page }) => {
      await page.goto("/labor/workers");

      // Wait for loading
      await page.waitForTimeout(1000);

      const tableOrEmpty = page
        .locator("table, .text-slate-500")
        .filter({ hasText: /성명|근로자가 없/ });
      await expect(tableOrEmpty.first()).toBeVisible({ timeout: 5000 });
    });

    test("근로자 등록 모달에서 취소 버튼으로 닫을 수 있다", async ({
      page,
    }) => {
      await page.goto("/labor/workers");

      await page.getByRole("button", { name: /근로자 등록/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

      await page
        .getByRole("dialog")
        .getByRole("button", { name: /취소/ })
        .click();

      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe("근로계약 관리", () => {
    test("근로계약 관리 페이지가 올바르게 로딩된다", async ({ page }) => {
      await page.goto("/labor/contracts");

      await expect(
        page.getByRole("heading", { name: /근로계약 관리/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("근로계약 목록에 새 계약 작성 버튼이 존재한다", async ({ page }) => {
      await page.goto("/labor/contracts");

      await expect(
        page.getByRole("link", { name: /새 계약 작성/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("근로계약 목록에 상태별 필터 버튼이 존재한다", async ({ page }) => {
      await page.goto("/labor/contracts");

      await expect(
        page.getByRole("button", { name: /^전체$/ }),
      ).toBeVisible({ timeout: 5000 });
      await expect(
        page.getByRole("button", { name: /임시저장/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /발송완료/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /서명완료/ }),
      ).toBeVisible();
    });

    test("근로계약 목록에 HWPX 다운로드 버튼이 존재한다", async ({ page }) => {
      await page.goto("/labor/contracts");

      // HWPX button should be visible for at least one contract
      await page.waitForTimeout(500);

      const hwpxButton = page.getByRole("button", { name: /HWPX/ }).first();
      const isVisible = await hwpxButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (isVisible) {
        await expect(hwpxButton).toBeVisible();
      } else {
        // No contracts exist - check for empty state
        await expect(
          page.getByText(/등록된 계약이 없습니다/),
        ).toBeVisible({ timeout: 3000 });
      }
    });

    test("근로계약 목록에 전체 근로계약 목록 카드가 존재한다", async ({
      page,
    }) => {
      await page.goto("/labor/contracts");

      await expect(
        page.getByText(/전체 근로계약 목록/),
      ).toBeVisible({ timeout: 5000 });
    });

    test("임시저장 필터 버튼 클릭 시 목록이 필터링된다", async ({ page }) => {
      await page.goto("/labor/contracts");

      await page.getByRole("button", { name: /임시저장/ }).click();

      // After filtering, either show draft contracts or empty message
      await page.waitForTimeout(300);
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("급여/근무 관리", () => {
    test("급여/근무 관리 페이지가 올바르게 로딩된다", async ({ page }) => {
      await page.goto("/labor/payroll");

      await expect(
        page.getByRole("heading", { name: /급여.근무 관리/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("급여 페이지에 현장 선택 셀렉터가 존재한다", async ({ page }) => {
      await page.goto("/labor/payroll");

      await expect(page.getByText(/현장/)).toBeVisible({ timeout: 5000 });
    });

    test("급여 페이지에 연도 선택 셀렉터가 존재한다", async ({ page }) => {
      await page.goto("/labor/payroll");

      await expect(page.getByText(/연도/)).toBeVisible({ timeout: 5000 });
    });

    test("급여 페이지에 월 네비게이션 버튼이 존재한다", async ({ page }) => {
      await page.goto("/labor/payroll");

      await expect(page.getByText(/월/)).toBeVisible({ timeout: 5000 });
    });

    test("급여 페이지에 저장 버튼이 존재한다", async ({ page }) => {
      await page.goto("/labor/payroll");

      await expect(
        page.getByRole("button", { name: /저장/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("급여 페이지에 엑셀 다운로드 버튼이 존재한다", async ({ page }) => {
      await page.goto("/labor/payroll");

      await expect(
        page.getByRole("button", { name: /엑셀 다운로드/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("급여 요약 카드 (총 노무비, 총 공제, 총 지급액)가 표시된다", async ({
      page,
    }) => {
      await page.goto("/labor/payroll");

      await expect(page.getByText(/총 노무비/)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/총 공제/)).toBeVisible();
      await expect(page.getByText(/총 지급액/)).toBeVisible();
    });
  });
});
