import { Page } from "@playwright/test";

/**
 * Logs in as superadmin (SA) using the quick login button.
 * Redirects to /dashboard on success.
 */
export async function loginAsSuperAdmin(page: Page) {
  await page.goto("/login");
  await page
    .locator("button")
    .filter({ hasText: /최고관리자/ })
    .first()
    .click();
  await page.waitForURL(/\/(dashboard|$)/, { timeout: 10000 });
}

/**
 * Logs in as company CEO (대표) using the quick login button.
 */
export async function loginAsCeo(page: Page) {
  await page.goto("/login");
  await page
    .locator("button")
    .filter({ hasText: /대표/ })
    .first()
    .click();
  await page.waitForURL(/\/(dashboard|$)/, { timeout: 10000 });
}

/**
 * Logs in as site manager (현장소장) using the quick login button.
 */
export async function loginAsSiteManager(page: Page) {
  await page.goto("/login");
  await page
    .locator("button")
    .filter({ hasText: /현장소장/ })
    .first()
    .click();
  await page.waitForURL(/\/(dashboard|$)/, { timeout: 10000 });
}

/**
 * Logs in as worker (근로자) using the quick login button.
 */
export async function loginAsWorker(page: Page) {
  await page.goto("/login");
  await page
    .locator("button")
    .filter({ hasText: /근로자/ })
    .first()
    .click();
  await page.waitForURL(/\/(dashboard|$)/, { timeout: 10000 });
}

/**
 * Logs in via the form with username and password.
 */
export async function loginWithCredentials(
  page: Page,
  username: string,
  password: string,
) {
  await page.goto("/login");
  await page.getByLabel(/아이디/).fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: /^로그인$/ }).click();
  await page.waitForURL(/\/(dashboard|$)/, { timeout: 10000 });
}
