import { defineConfig, devices } from "@playwright/test";

const contactMode =
  process.env.KN_PLAYWRIGHT_SUITE === "contact" ||
  process.env.npm_lifecycle_event === "test:e2e:contact";
const securityMode = process.env.KN_PLAYWRIGHT_SUITE === "security";
const seoMode = process.env.KN_PLAYWRIGHT_SUITE === "seo";
const accessibilityMode = process.env.KN_PLAYWRIGHT_SUITE === "accessibility";
const externalServer = process.env.KN_PLAYWRIGHT_EXTERNAL_SERVER === "true";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? (contactMode ? "http://127.0.0.1:8888" : "http://127.0.0.1:3000");
const serverUrl = new URL(baseURL);
const serverPort = serverUrl.port || (serverUrl.protocol === "https:" ? "443" : "80");
const webServerCommand = contactMode
  ? process.env.PLAYWRIGHT_BASE_URL
    ? `npm run start -- -p ${serverPort}`
    : process.env.KN_CONTACT_WEB_SERVER_COMMAND ?? "npm run contact:dev"
  : `npm run start -- -p ${serverPort}`;

const standardProjects = [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 900 } },
  },
  {
    name: "firefox",
    use: { ...devices["Desktop Firefox"], viewport: { width: 1024, height: 900 } },
  },
  {
    name: "webkit",
    use: { ...devices["Desktop Safari"], viewport: { width: 1024, height: 900 } },
  },
];

const accessibilityProjects = [
  { browserName: "chromium", device: devices["Desktop Chrome"] },
  { browserName: "firefox", device: devices["Desktop Firefox"] },
  { browserName: "webkit", device: devices["Desktop Safari"] },
].flatMap(({ browserName, device }) => [
  { width: 320, height: 760 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
].map((viewport) => ({
  name: `${browserName}-a11y-${viewport.width}`,
  use: { ...device, viewport, hasTouch: viewport.width === 320 },
})));

export default defineConfig({
  testDir: "./tests",
  outputDir: "test-results/playwright",
  testMatch: contactMode
    ? ["contact-form/**/*.spec.ts"]
    : securityMode
      ? ["production-readiness/security-headers.spec.ts"]
      : seoMode
        ? ["production-readiness/seo.spec.ts"]
        : accessibilityMode
          ? [
              "production-readiness/accessibility-public.spec.ts",
              "production-readiness/accessibility-admin.spec.ts",
            ]
    : ["admin-auth/**/*.spec.ts", "services-management/**/*.spec.ts", "gallery-management/**/*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  globalSetup: contactMode || securityMode || seoMode ? undefined : "./tests/admin-auth/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: accessibilityMode ? accessibilityProjects : standardProjects,
  webServer: externalServer ? undefined : {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_BASE_URL,
    timeout: 120_000,
  },
});
