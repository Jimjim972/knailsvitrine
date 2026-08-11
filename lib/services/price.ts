import type { ServicePriceType } from "./constants.ts";

const MAX_MINOR_UNITS = 9_999_999_999;

export function parsePriceToMinorUnits(input: string): number | null {
  const value = input.trim();
  if (!/^(?:0|[1-9]\d{0,7})(?:[.,]\d{1,2})?$/.test(value)) return null;
  const [euros, fraction = ""] = value.replace(",", ".").split(".");
  const cents = Number(euros) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= MAX_MINOR_UNITS ? cents : null;
}

export function decimalToMinorUnits(value: string | number | null): number | null {
  if (value === null) return null;
  return parsePriceToMinorUnits(String(value));
}

export function minorUnitsToDecimal(value: number): string {
  const euros = Math.floor(value / 100);
  const cents = value % 100;
  return `${euros}.${String(cents).padStart(2, "0")}`;
}

export function formatPrice(value: number | null, type: ServicePriceType): string {
  if (type === "quote") return "Sur devis";
  if (value === null) throw new Error("A tariffed service requires a price");
  const euros = Math.floor(value / 100);
  const cents = value % 100;
  const amount = cents === 0 ? String(euros) : `${euros},${String(cents).padStart(2, "0")}`;
  return `${type === "starting_at" ? "À partir de " : ""}${amount} €`;
}
