import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { GALLERY_BOOTSTRAP_ITEMS } from "./bootstrap-gallery-data.mjs";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
if (packageJson.devDependencies?.sharp !== "0.35.3") throw new Error("sharp must be pinned exactly to 0.35.3");
const search = spawnSync("rg", ["-n", "from [\\\"']sharp[\\\"']|require\\([\\\"']sharp", "app", "components", "lib", "scripts"], { encoding: "utf8" });
const imports = search.stdout.trim().split("\n").filter(Boolean); if (imports.some((line) => !line.startsWith("scripts/bootstrap-gallery.mjs:"))) throw new Error("sharp leaked outside the bootstrap");
const nodeArgs = ["--experimental-strip-types", "scripts/bootstrap-gallery.mjs", "--local"];
const first = spawnSync(process.execPath, nodeArgs, { stdio: "inherit" }); if (first.status !== 0) process.exit(first.status ?? 1);
const second = spawnSync(process.execPath, nodeArgs, { encoding: "utf8" }); if (second.status !== 0 || second.stdout.split("\n").filter((line) => line.startsWith("unchanged ")).length !== GALLERY_BOOTSTRAP_ITEMS.length) throw new Error("Bootstrap is not idempotent");
process.stdout.write(`verified ${GALLERY_BOOTSTRAP_ITEMS.length} bootstrap pairs\n`);
