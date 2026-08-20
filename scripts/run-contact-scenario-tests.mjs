import { spawnSync } from "node:child_process";

const port = 3401;
const result = spawnSync("npx", ["playwright", "test", "tests/contact-form"], {
  stdio: "inherit",
  env: {
    ...process.env,
    KN_PLAYWRIGHT_SUITE: "contact",
    PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${port}`,
  },
});

if (result.status !== 0) process.exit(result.status ?? 1);
