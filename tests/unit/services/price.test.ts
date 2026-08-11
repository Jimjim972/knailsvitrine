import assert from "node:assert/strict";
import test from "node:test";
import { decimalToMinorUnits, formatPrice, minorUnitsToDecimal, parsePriceToMinorUnits } from "../../../lib/services/price.ts";

test("normalizes comma and point without floating-point business arithmetic", () => {
  assert.equal(parsePriceToMinorUnits("0"), 0);
  assert.equal(parsePriceToMinorUnits("0,01"), 1);
  assert.equal(parsePriceToMinorUnits("45.50"), 4550);
  assert.equal(parsePriceToMinorUnits("99999999,99"), 9_999_999_999);
  assert.equal(minorUnitsToDecimal(4550), "45.50");
  assert.equal(decimalToMinorUnits("45.50"), 4550);
});

test("rejects excessive precision, thousands, ambiguity and bounds", () => {
  for (const value of ["1.005", "1,005", "1 000", "1,000.00", "-1", "100000000", "NaN", ""]) {
    assert.equal(parsePriceToMinorUnits(value), null, value);
  }
});

test("formats the four canonical labels exactly", () => {
  assert.equal(formatPrice(4500, "fixed"), "45 €");
  assert.equal(formatPrice(4550, "fixed"), "45,50 €");
  assert.equal(formatPrice(4550, "starting_at"), "À partir de 45,50 €");
  assert.equal(formatPrice(null, "quote"), "Sur devis");
});
