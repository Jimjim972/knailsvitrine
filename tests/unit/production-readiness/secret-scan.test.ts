import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { scanSecretSurfaces } from "../../../scripts/scan-build-secrets.mjs";

const privilegedKey = ["sb", "secret", "fixturevalue1234567890"].join("_");
const contactBody = ["contact", "content"].join("-") + "=Demande privée de rendez-vous";

function withWorkspace(run: (workspace: string) => void) {
  const workspace = mkdtempSync(join(tmpdir(), "knails-secret-scan-"));
  try {
    run(workspace);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

function write(workspace: string, relativePath: string, content: string) {
  const path = join(workspace, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function expectClosedFailure(result: ReturnType<typeof scanSecretSurfaces>, surface: string) {
  assert.equal(result.status, "fail");
  assert.deepEqual(result.surfaces, [surface]);
  assert.ok(result.findingCount > 0);
  assert.equal(JSON.stringify(result).includes(privilegedKey), false);
  assert.equal(JSON.stringify(result).includes(contactBody), false);
}

test("le scan classe séparément dépôt, build, réponses et rapport sans imprimer la valeur", () => {
  const cases = [
    ["repository", "src/leak.txt", `token=${privilegedKey}`],
    ["build", ".next/static/chunks/leak.js", `token=${privilegedKey}`],
    ["responses", "test-results/production-readiness/candidate/responses/contact.txt", contactBody],
    ["report", "test-results/production-readiness/candidate/report.json", `{"secret":"${privilegedKey}"}`],
  ] as const;

  for (const [surface, relativePath, content] of cases) {
    withWorkspace((workspace) => {
      write(workspace, relativePath, content);
      expectClosedFailure(scanSecretSurfaces({ workspace, includeHistory: false }), surface);
    });
  }
});

test("le scan inspecte l'historique du candidat même si l'arbre courant est propre", () => {
  withWorkspace((workspace) => {
    execFileSync("git", ["init", "-q"], { cwd: workspace });
    execFileSync("git", ["config", "user.name", "Readiness Fixture"], { cwd: workspace });
    execFileSync("git", ["config", "user.email", "fixture@example.invalid"], { cwd: workspace });
    write(workspace, "history.txt", `token=${privilegedKey}`);
    execFileSync("git", ["add", "history.txt"], { cwd: workspace });
    execFileSync("git", ["commit", "-qm", "fixture"], { cwd: workspace });
    write(workspace, "history.txt", "clean\n");

    expectClosedFailure(scanSecretSurfaces({ workspace, includeHistory: true }), "history");
  });
});

test("un candidat propre retourne une preuve minimale sans contenu inspecté", () => {
  withWorkspace((workspace) => {
    write(workspace, "src/clean.txt", "public content\n");
    const result = scanSecretSurfaces({ workspace, includeHistory: false });
    assert.deepEqual(result, { status: "pass", findingCount: 0, surfaces: [] });
  });
});
