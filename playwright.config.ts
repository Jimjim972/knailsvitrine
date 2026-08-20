import { defineConfig, devices } from "@playwright/test";

const contactMode =
  process.env.KN_PLAYWRIGHT_SUITE === "contact" ||
  process.env.npm_lifecycle_event === "test:e2e:contact";
const securityMode = process.env.KN_PLAYWRIGHT_SUITE === "security";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? (contactMode ? "http://127.0.0.1:8888" : "http://127.0.0.1:3000");
const serverUrl = new URL(baseURL);
const serverPort = serverUrl.port || (serverUrl.protocol === "https:" ? "443" : "80");
const webServerCommand = contactMode
  ? process.env.PLAYWRIGHT_BASE_URL
    ? `npm run start -- -p ${serverPort}`
    : process.env.KN_CONTACT_WEB_SERVER_COMMAND ?? "npm run contact:dev"
  : `npm run start -- -p ${serverPort}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: contactMode
    ? ["contact-form/**/*.spec.ts"]
    : securityMode
      ? ["production-readiness/security-headers.spec.ts"]
    : ["admin-auth/**/*.spec.ts", "services-management/**/*.spec.ts", "gallery-management/**/*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  globalSetup: contactMode || securityMode ? undefined : "./tests/admin-auth/global-setup.ts",
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
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_BASE_URL,
    timeout: 120_000,
  },
});
