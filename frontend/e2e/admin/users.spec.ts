import { test, expect } from "@playwright/test"

test.describe("Admin Users Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/이메일/).fill("admin@yunigreen.test")
    await page.getByLabel(/비밀번호/).fill("admin123!")
    await page.getByRole("button", { name: /로그인/ }).click()
    await expect(page).toHaveURL("/")
  })

  test("should navigate to users page", async ({ page }) => {
    await page.getByRole("link", { name: /사용자/ }).click()
    
    await expect(page).toHaveURL("/users")
    await expect(page.getByRole("heading", { name: /사용자 관리/ })).toBeVisible()
  })

  test("should open user creation modal", async ({ page }) => {
    await page.goto("/users")
    
    await page.getByRole("button", { name: /새 사용자/ }).click()
    
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByText(/사용자 추가/)).toBeVisible()
  })

  test("should create a new user", async ({ page }) => {
    await page.goto("/users")
    
    await page.getByRole("button", { name: /새 사용자/ }).click()
    
    const timestamp = Date.now()
    await page.getByLabel(/이름/).fill(`테스트 사용자 ${timestamp}`)
    await page.getByLabel(/이메일/).fill(`test${timestamp}@example.com`)
    await page.getByLabel(/비밀번호/).fill("testpassword123!")
    
    await page.getByRole("button", { name: /저장/ }).click()
    
    await expect(page.getByRole("dialog")).not.toBeVisible()
  })
})
