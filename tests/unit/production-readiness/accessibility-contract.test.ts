import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { MINIMUM_TARGET_SIZE } from "../../helpers/accessibility.ts";

const CSS_PATH = new URL("../../../app/globals.css", import.meta.url);

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const normalized = hex.replace("#", "");
  const [red, green, blue] = [0, 2, 4].map((offset) =>
    channel(Number.parseInt(normalized.slice(offset, offset + 2), 16))
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

async function tokens(): Promise<Record<string, string>> {
  const css = await readFile(CSS_PATH, "utf8");
  return Object.fromEntries(
    [...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((match) => [match[1], match[2]]),
  );
}

test("les couples de texte à fond uni respectent 4,5:1", async () => {
  const color = await tokens();
  const pairs = [
    ["ink", "background"],
    ["muted", "background"],
    ["primary", "background"],
    ["primary-dark", "surface"],
    ["gold", "background"],
    ["status-success-text", "status-success-bg"],
    ["status-error-text", "status-error-bg"],
    ["status-warning-text", "status-warning-bg"],
    ["status-info-text", "status-info-bg"],
  ] as const;
  for (const [foreground, background] of pairs) {
    assert.ok(
      contrastRatio(color[foreground], color[background]) >= 4.5,
      `${foreground} on ${background}`,
    );
  }
  assert.ok(contrastRatio("#ffffff", color.primary) >= 4.5, "white on primary");
  assert.ok(contrastRatio("#ffffff", color.tertiary) >= 4.5, "white on tertiary");
});

test("les indicateurs de focus unis respectent 3:1", async () => {
  const color = await tokens();
  assert.ok(contrastRatio(color.gold, color.background) >= 3);
  assert.ok(contrastRatio(color.gold, color.surface) >= 3);
  assert.ok(contrastRatio(color["status-error-text"], color.blush) >= 3);
});

test("le contrat tactile du projet reste fixé à 44 × 44 CSS px", () => {
  assert.equal(MINIMUM_TARGET_SIZE, 44);
});

