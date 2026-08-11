import assert from "node:assert/strict";
import test from "node:test";
import { serviceFormValues, validateServiceValues, validateVisibilityValues } from "../../../lib/validations/service.ts";
import type { ServiceFormValues } from "../../../lib/services/types.ts";

const valid: ServiceFormValues = { name: "Service valide", description: "Description", category: "onglerie_manucure", priceType: "fixed", price: "45", durationMinutes: "45", badge: "Populaire", displayOrder: "0", active: "true" };

type Case = { id: number; patch: Partial<ServiceFormValues>; accepted: boolean; field?: keyof ServiceFormValues; check?: (data: ReturnType<typeof validateServiceValues>) => void };
const cases: Case[] = [
  { id: 1, patch: { name: "AB" }, accepted: true }, { id: 2, patch: { name: "N".repeat(120) }, accepted: true },
  { id: 3, patch: { name: "N" }, accepted: false, field: "name" }, { id: 4, patch: { name: "N".repeat(121) }, accepted: false, field: "name" },
  { id: 5, patch: { description: "D" }, accepted: true }, { id: 6, patch: { description: "D".repeat(1000) }, accepted: true },
  { id: 7, patch: { description: "   " }, accepted: false, field: "description" }, { id: 8, patch: { description: "D".repeat(1001) }, accepted: false, field: "description" },
  { id: 9, patch: { price: "0" }, accepted: true, check: (result) => { if (result.success) assert.equal(result.data.priceMinorUnits, 0); } },
  { id: 10, patch: { priceType: "starting_at", price: "99999999,99" }, accepted: true, check: (result) => { if (result.success) assert.equal(result.data.priceMinorUnits, 9_999_999_999); } },
  { id: 11, patch: { price: "12.34" }, accepted: true, check: (result) => { if (result.success) assert.equal(result.data.priceMinorUnits, 1234); } },
  { id: 12, patch: { price: "" }, accepted: false, field: "price" }, { id: 13, patch: { price: "1,005" }, accepted: false, field: "price" },
  { id: 14, patch: { price: "-0,01" }, accepted: false, field: "price" }, { id: 15, patch: { price: "100000000" }, accepted: false, field: "price" },
  { id: 16, patch: { priceType: "quote", price: "999" }, accepted: true, check: (result) => { if (result.success) assert.equal(result.data.priceMinorUnits, null); } },
  { id: 17, patch: { durationMinutes: "" }, accepted: true, check: (result) => { if (result.success) assert.equal(result.data.durationMinutes, null); } },
  { id: 18, patch: { durationMinutes: "5" }, accepted: true }, { id: 19, patch: { durationMinutes: "600" }, accepted: true },
  { id: 20, patch: { durationMinutes: "4" }, accepted: false, field: "durationMinutes" }, { id: 21, patch: { durationMinutes: "601" }, accepted: false, field: "durationMinutes" },
  { id: 22, patch: { badge: "" }, accepted: true, check: (result) => { if (result.success) assert.equal(result.data.badge, null); } },
  { id: 23, patch: { badge: "B" }, accepted: true }, { id: 24, patch: { badge: "B".repeat(40) }, accepted: true },
  { id: 25, patch: { badge: "B".repeat(41) }, accepted: false, field: "badge" }, { id: 26, patch: { displayOrder: "0" }, accepted: true },
  { id: 27, patch: { displayOrder: "-1" }, accepted: false, field: "displayOrder" }, { id: 28, patch: { displayOrder: "0.5" }, accepted: false, field: "displayOrder" },
];

test("executes the canonical SC-003 matrix without substitution", async (t) => {
  assert.equal(cases.length, 28);
  for (const item of cases) await t.test(`case ${item.id}`, () => {
    const result = validateServiceValues({ ...valid, ...item.patch });
    assert.equal(result.success, item.accepted);
    if (!result.success && item.field) assert.ok(result.fieldErrors[item.field]?.length);
    item.check?.(result);
  });
});

test("covers supplementary integer, trimming and invalid enum cases", () => {
  assert.equal(validateServiceValues({ ...valid, durationMinutes: "5.5" }).success, false);
  const trimmed = validateServiceValues({ ...valid, name: "  Service  ", description: "  D  " });
  assert.equal(trimmed.success, true);
  if (trimmed.success) assert.deepEqual([trimmed.data.name, trimmed.data.description], ["Service", "D"]);
  assert.equal(validateServiceValues({ ...valid, category: "autre" }).success, false);
  assert.equal(validateServiceValues({ ...valid, displayOrder: "2147483648" }).success, false);
  assert.equal(validateServiceValues({ ...valid, active: "on" }).success, false);
});

test("defaults visibility only on create and requires closed booleans on update", () => {
  const create = new FormData();
  const update = new FormData();
  assert.equal(serviceFormValues(create, { mode: "create" }).active, "true");
  assert.equal(serviceFormValues(update, { mode: "update" }).active, "");

  update.set("active", "on");
  assert.equal(validateServiceValues({ ...valid, active: serviceFormValues(update, { mode: "update" }).active }).success, false);
  assert.equal(validateVisibilityValues("00000000-0000-4000-8000-000000000001", "true").success, true);
  assert.equal(validateVisibilityValues("00000000-0000-4000-8000-000000000001", "on").success, false);
  assert.equal(validateVisibilityValues("00000000-0000-4000-8000-000000000001", "").success, false);
});
