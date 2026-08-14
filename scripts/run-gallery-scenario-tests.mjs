import { spawnSync } from "node:child_process";

const { runGalleryEnduranceMatrix, runGalleryFailureMatrix, runGalleryInterruptionMatrix } = await import("../lib/gallery/e2e-scenario.ts");
const interruptions = runGalleryInterruptionMatrix();
const failures = runGalleryFailureMatrix();
const endurance = runGalleryEnduranceMatrix();
process.stdout.write(`${JSON.stringify({ interruptions: interruptions.length, failures: failures.length, endurance })}\n`);

for (const scenario of ["admin-empty", "admin-unavailable"]) {
  const port = scenario === "admin-empty" ? "3301" : "3302";
  const result = spawnSync("npx", ["playwright", "test", "tests/gallery-management/error-states.spec.ts", "--project=chromium"], {
    stdio: "inherit", env: { ...process.env, KN_GALLERY_E2E_SCENARIO: scenario, PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${port}` },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
