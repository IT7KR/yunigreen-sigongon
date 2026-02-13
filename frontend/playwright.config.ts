import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    {
      name: "admin",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3033",
      },
      testMatch: /admin\/.*.spec.ts/,
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        baseURL: "http://localhost:3034",
      },
      testMatch: /mobile\/.*.spec.ts/,
    },
  ],

  webServer: [
    {
      command: "pnpm --filter @sigongon/admin dev",
      url: "http://localhost:3033",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: "pnpm --filter @sigongon/mobile dev",
      url: "http://localhost:3034",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
