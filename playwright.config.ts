import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const serverUrl = new URL(baseURL);
const serverPort = serverUrl.port || (serverUrl.protocol === "https:" ? "443" : "80");

export default defineConfig({
  testDir: "./tests",
  testMatch: ["admin-auth/**/*.spec.ts", "services-management/**/*.spec.ts", "gallery-management/**/*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  globalSetup: "./tests/admin-auth/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 900 },
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1024, height: 900 },
      },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${serverPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
