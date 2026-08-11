import { z } from "zod";
import { SERVICE_CATEGORIES, SERVICE_PRICE_TYPES, type ServiceCategoryCode, type ServicePriceType } from "../services/constants.ts";
import { minorUnitsToDecimal, parsePriceToMinorUnits } from "../services/price.ts";
import type { ServiceFormValues } from "../services/types.ts";

const categoryCodes = SERVICE_CATEGORIES.map(({ code }) => code) as [ServiceCategoryCode, ...ServiceCategoryCode[]];
const priceTypes = [...SERVICE_PRICE_TYPES] as [ServicePriceType, ...ServicePriceType[]];

const rawSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(120, "Le nom ne peut pas dépasser 120 caractères."),
  description: z.string().trim().min(1, "La description est requise.").max(1000, "La description ne peut pas dépasser 1 000 caractères."),
  category: z.enum(categoryCodes, { message: "Choisissez une catégorie valide." }),
  priceType: z.enum(priceTypes, { message: "Choisissez un type de tarif valide." }),
  price: z.string(),
  durationMinutes: z.string().trim().refine((value) => value === "" || /^\d+$/.test(value), "La durée doit être un nombre entier.").refine((value) => value === "" || (Number(value) >= 5 && Number(value) <= 600), "La durée doit être comprise entre 5 et 600 minutes."),
  badge: z.string().trim().max(40, "Le badge ne peut pas dépasser 40 caractères."),
  displayOrder: z.string().trim()
    .regex(/^\d+$/, "L’ordre doit être un entier positif ou nul.")
    .refine((value) => Number.isSafeInteger(Number(value)) && Number(value) <= 2_147_483_647, "L’ordre dépasse la valeur maximale autorisée."),
  active: z.enum(["true", "false"], { message: "Choisissez un statut de publication valide." }),
}).superRefine((value, context) => {
  if (value.priceType !== "quote" && parsePriceToMinorUnits(value.price) === null) {
    context.addIssue({ code: "custom", path: ["price"], message: "Saisissez un montant valide entre 0 et 99 999 999,99 €." });
  }
});

export type NormalizedServiceInput = {
  name: string; description: string; category: ServiceCategoryCode; priceType: ServicePriceType;
  priceMinorUnits: number | null; databasePrice: string | null; durationMinutes: number | null;
  badge: string | null; displayOrder: number; active: boolean;
};

export function serviceFormValues(formData: FormData, options: { mode: "create" | "update" } = { mode: "create" }): ServiceFormValues {
  const value = (name: string) => String(formData.get(name) ?? "");
  const activeValues = formData.getAll("active").map(String);
  const active = activeValues.length === 0
    ? options.mode === "create" ? "true" : ""
    : activeValues.length === 1 && ["true", "false"].includes(activeValues[0])
      ? activeValues[0]
      : activeValues.length === 2 && activeValues[0] === "false" && activeValues[1] === "true"
        ? "true"
        : "";
  return {
    name: value("name"), description: value("description"), category: value("category"),
    priceType: value("priceType"), price: value("price"), durationMinutes: value("durationMinutes"),
    badge: value("badge"), displayOrder: formData.has("displayOrder") ? value("displayOrder") : options.mode === "create" ? "0" : "",
    active,
  };
}

export function validateServiceValues(values: ServiceFormValues) {
  const parsed = rawSchema.safeParse(values);
  if (!parsed.success) return { success: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  const priceMinorUnits = parsed.data.priceType === "quote" ? null : parsePriceToMinorUnits(parsed.data.price);
  if (parsed.data.priceType !== "quote" && priceMinorUnits === null) throw new Error("Validated price missing");
  return {
    success: true as const,
    data: {
      name: parsed.data.name, description: parsed.data.description, category: parsed.data.category,
      priceType: parsed.data.priceType, priceMinorUnits,
      databasePrice: priceMinorUnits === null ? null : minorUnitsToDecimal(priceMinorUnits),
      durationMinutes: parsed.data.durationMinutes === "" ? null : Number(parsed.data.durationMinutes),
      badge: parsed.data.badge === "" ? null : parsed.data.badge,
      displayOrder: Number(parsed.data.displayOrder), active: parsed.data.active === "true",
    } satisfies NormalizedServiceInput,
  };
}

export const serviceIdSchema = z.uuid("Identifiant de prestation invalide.");

const visibilitySchema = z.object({
  serviceId: serviceIdSchema,
  active: z.enum(["true", "false"], { message: "Statut de publication invalide." }),
});

export function validateVisibilityValues(serviceId: string, active: string) {
  const parsed = visibilitySchema.safeParse({ serviceId, active });
  if (!parsed.success) return { success: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  return { success: true as const, data: { id: parsed.data.serviceId, active: parsed.data.active === "true" } };
}
