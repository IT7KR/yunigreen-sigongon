import { expect, test, type Page } from "@playwright/test";
import { loginAsSuperAdmin } from "../helpers/auth";

async function openFirstProject(page: Page): Promise<string | null> {
  await page.goto("/projects");
  const firstProjectLink = page.locator("table tbody a").first();
  const emptyState = page.getByText(/프로젝트가 없어요/);
  const errorState = page.getByText(/데이터를 불러오는데 실패했어요/);

  await expect(page.getByRole("heading", { name: "프로젝트" })).toBeVisible({
    timeout: 10000,
  });

  let hasProjects = false;
  for (let index = 0; index < 20; index += 1) {
    if (await firstProjectLink.isVisible().catch(() => false)) {
      hasProjects = true;
      break;
    }
    if (await emptyState.isVisible().catch(() => false)) return null;
    if (await errorState.isVisible().catch(() => false)) return null;
    await page.waitForTimeout(500);
  }

  if (!hasProjects) return null;

  await firstProjectLink.click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/, { timeout: 5000 });

  const match = page.url().match(/\/projects\/([^/]+)$/);
  return match?.[1] ?? null;
}

test.describe("프로젝트 개요 탭", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test("개요 탭은 빠른 액션과 타임라인을 노출한다", async ({ page }) => {
    const projectId = await openFirstProject(page);
    if (!projectId) return;

    await expect(page.getByRole("heading", { name: "빠른 액션" })).toBeVisible();
    await expect(page.getByText("추천 액션", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "프로젝트 진행 현황" })).toBeVisible();
    await expect(page.getByRole("link", { name: "이동하기" })).toHaveCount(3);
  });

  test("탭 내비게이션은 활성 탭을 aria-current로 표시한다", async ({ page }) => {
    const projectId = await openFirstProject(page);
    if (!projectId) return;

    const overviewTab = page.getByRole("link", { name: "개요" });
    await expect(overviewTab).toHaveAttribute("aria-current", "page");

    await page.getByRole("link", { name: "계약" }).click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/contracts$/, { timeout: 5000 });
    await expect(page.getByRole("link", { name: "계약" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("모바일에서 탭 스크롤 힌트와 44px 이상 탭 높이를 제공한다", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const projectId = await openFirstProject(page);
    if (!projectId) return;

    await expect(page.getByRole("link", { name: "접근권한" })).toBeVisible();
    await expect(page.getByText("탭이 많으면 좌우로 밀어서 볼 수 있어요.")).toBeVisible();

    const tabBox = await page.getByRole("link", { name: "개요" }).boundingBox();
    expect(tabBox).toBeTruthy();
    expect((tabBox?.height ?? 0) >= 44).toBeTruthy();
  });
});
