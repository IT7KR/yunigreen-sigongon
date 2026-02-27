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
  ],

  webServer: [
    {
      command: "pnpm dev",
      url: "http://localhost:3033",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
