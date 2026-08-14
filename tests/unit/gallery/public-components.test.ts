import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const imageSource = readFileSync("components/gallery-image.tsx", "utf8");
const gridSource = readFileSync("components/gallery-grid.tsx", "utf8");
const pageSource = readFileSync("app/(public)/galerie/page.tsx", "utf8");

test("only immediately visible cards declare eager loading", () => {
  assert.match(imageSource, /loading=\{eager \? "eager" : "lazy"\}/);
  assert.doesNotMatch(imageSource, /loading="eager"/);
  assert.match(gridSource, /eager=\{index < 2\}/);
});

test("public sections are independently omitted and the empty message is unique", () => {
  assert.match(gridSource, /if \(main\.length === 0\) return null/);
  assert.match(pageSource, /partitionPublicGalleryPhotos/);
  assert.match(pageSource, /\{empty/);
  assert.equal((pageSource.match(/Galerie en préparation/g) ?? []).length, 1);
});

test("main gallery cards receive validated external destinations", () => {
  assert.match(gridSource, /externalUrl=\{photo\.externalUrl\}/);
  assert.match(imageSource, /href=\{externalUrl\}/);
  assert.match(imageSource, /aria-label=\{`Ouvrir \$\{title \?\? alt\}`\}/);
});
