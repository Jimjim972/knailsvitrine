import { z } from "zod";
import {
  GALLERY_IMAGE_LIMITS,
  GALLERY_VARIANTS,
  GALLERY_WEBP_PATH_PATTERN,
  type GalleryVariant,
} from "../gallery/constants.ts";
import type { GalleryFormValues } from "../gallery/types.ts";

const variants = [...GALLERY_VARIANTS] as [GalleryVariant, ...GalleryVariant[]];

export const galleryPhotoIdSchema = z.uuid("Identifiant de photo invalide.");
export const galleryOperationIdSchema = z.uuid("Identifiant d’opération invalide.");
export const galleryWebpPathSchema = z.string().regex(GALLERY_WEBP_PATH_PATTERN, "Chemin WebP invalide.");

const optionalTrimmed = (maximum: number, message: string) => z.string().trim().max(maximum, message)
  .transform((value) => value === "" ? null : value);

export const galleryFormSchema = z.object({
  altText: z.string().trim().min(1, "Le texte alternatif est requis.").max(200, "Le texte alternatif ne peut pas dépasser 200 caractères."),
  title: optionalTrimmed(120, "Le titre ne peut pas dépasser 120 caractères."),
  label: optionalTrimmed(40, "Le libellé ne peut pas dépasser 40 caractères."),
  externalUrl: z.string().trim().max(2048, "Le lien est trop long.").transform((value, context) => {
    if (value === "") return null;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error("invalid");
      return url.toString();
    } catch {
      context.addIssue({ code: "custom", message: "Saisissez une URL HTTPS valide." });
      return z.NEVER;
    }
  }),
  variant: z.enum(variants, { message: "Choisissez une variante valide." }),
  displayOrder: z.string().trim().regex(/^\d+$/, "L’ordre doit être un entier positif ou nul.")
    .refine((value) => Number.isSafeInteger(Number(value)) && Number(value) <= 2_147_483_647, "L’ordre dépasse la valeur maximale autorisée."),
  active: z.enum(["true", "false"], { message: "Choisissez une visibilité valide." }),
});

export const preparedImageMetadataSchema = z.object({
  mimeType: z.literal("image/webp"),
  width: z.coerce.number().int().min(1).max(GALLERY_IMAGE_LIMITS.maxOutputSide),
  height: z.coerce.number().int().min(1).max(GALLERY_IMAGE_LIMITS.maxOutputSide),
  sizeBytes: z.coerce.number().int().min(1).max(GALLERY_IMAGE_LIMITS.outputBytes),
});

export const galleryOperationSchema = z.object({
  photoId: galleryPhotoIdSchema,
  operationId: galleryOperationIdSchema,
});

export const galleryVisibilitySchema = z.object({
  photoId: galleryPhotoIdSchema,
  active: z.enum(["true", "false"], { message: "Statut de publication invalide." }),
});

export const galleryPhotoMutationSchema = z.object({
  photoId: galleryPhotoIdSchema,
  updatedAt: z.iso.datetime({ offset: true }),
});

export const galleryReplacementSchema = z.object({
  photoId: galleryPhotoIdSchema,
  mimeType: z.literal("image/webp"),
  width: z.coerce.number().int().min(1).max(GALLERY_IMAGE_LIMITS.maxOutputSide),
  height: z.coerce.number().int().min(1).max(GALLERY_IMAGE_LIMITS.maxOutputSide),
  sizeBytes: z.coerce.number().int().min(1).max(GALLERY_IMAGE_LIMITS.outputBytes),
});

export function galleryFormValues(formData: FormData, mode: "create" | "update" = "create"): GalleryFormValues {
  const value = (name: string) => String(formData.get(name) ?? "");
  const activeValues = formData.getAll("active").map(String);
  const active = activeValues.length === 0
    ? mode === "create" ? "true" : ""
    : activeValues.length === 1 && ["true", "false"].includes(activeValues[0])
      ? activeValues[0]
      : activeValues.length === 2 && activeValues[0] === "false" && activeValues[1] === "true"
        ? "true"
        : "";
  return {
    altText: value("altText"),
    title: value("title"),
    label: value("label"),
    externalUrl: value("externalUrl"),
    variant: value("variant"),
    displayOrder: formData.has("displayOrder") ? value("displayOrder") : mode === "create" ? "0" : "",
    active,
  };
}

export function validateGalleryFormValues(values: GalleryFormValues) {
  const parsed = galleryFormSchema.safeParse(values);
  if (!parsed.success) return { success: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  return {
    success: true as const,
    data: {
      altText: parsed.data.altText,
      title: parsed.data.title,
      label: parsed.data.label,
      externalUrl: parsed.data.externalUrl,
      variant: parsed.data.variant,
      displayOrder: Number(parsed.data.displayOrder),
      active: parsed.data.active === "true",
    },
  };
}
