import { spawnSync } from "node:child_process";

for (const [index, scenario] of ["admin-empty", "admin-unavailable", "public-unavailable"].entries()) {
  const result = spawnSync("npx", ["playwright", "test", "tests/services-management/error-states.spec.ts", "--project=chromium"], {
    stdio: "inherit",
    env: { ...process.env, KN_SERVICE_E2E_SCENARIO: scenario, PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${3201 + index}` },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
