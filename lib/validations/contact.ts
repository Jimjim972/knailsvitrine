import { z } from "zod";
import {
  CONTACT_FORM_NAMES,
  type ContactFormName,
} from "../contact/constants.ts";

export type ContactDraft = {
  name: string;
  phone: string;
  email: string;
  message: string;
};

export type ContactFormValues = ContactDraft & {
  submissionId: string;
  botField: string;
};

export type NormalizedContactSubmission = ContactFormValues;

export type ContactField = keyof ContactDraft | "submissionId";
export type ContactFieldErrors = Partial<Record<ContactField, string[]>>;
export type ContactErrorKind = "validation" | "network" | "timeout" | "provider" | "unexpected";

export type ContactActionState =
  | { phase: "idle"; values: ContactDraft; submissionId: string; fieldErrors: ContactFieldErrors }
  | {
      phase: "authorized";
      submissionId: string;
      submission: NormalizedContactSubmission;
      formName: ContactFormName;
    }
  | {
      phase: "error";
      errorKind: ContactErrorKind;
      values: ContactDraft;
      submissionId: string;
      fieldErrors: ContactFieldErrors;
    };

export const EMPTY_CONTACT_DRAFT: ContactDraft = {
  name: "",
  phone: "",
  email: "",
  message: "",
};

const nameSchema = z.string()
  .trim()
  .min(2, "Le nom doit contenir au moins 2 caractères.")
  .max(120, "Le nom ne peut pas dépasser 120 caractères.");

const phoneSchema = z.string()
  .trim()
  .min(6, "Le téléphone doit contenir entre 6 et 30 caractères.")
  .max(30, "Le téléphone doit contenir entre 6 et 30 caractères.")
  .regex(/^[0-9+ .()\-]*$/, "Le téléphone contient un caractère non autorisé.")
  .refine((value) => (value.match(/[0-9]/g) ?? []).length >= 6, {
    message: "Le téléphone doit contenir au moins 6 chiffres.",
  })
  .or(z.literal(""));

const emailSchema = z.string()
  .trim()
  .min(1, "L’e-mail est requis.")
  .max(254, "L’e-mail ne peut pas dépasser 254 caractères.")
  .email("Saisissez une adresse e-mail valide.");

const messageSchema = z.string()
  .trim()
  .min(10, "Le message doit contenir au moins 10 caractères.")
  .max(2_000, "Le message ne peut pas dépasser 2 000 caractères.");

const draftSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  message: messageSchema,
});

const actionInputSchema = draftSchema.extend({
  submissionId: z.uuid("L’identifiant de la demande est invalide."),
  botField: z.string().trim(),
});

const providerInputSchema = actionInputSchema.extend({
  formName: z.enum(CONTACT_FORM_NAMES, { message: "Le formulaire est invalide." }),
});

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function contactFormValues(formData: FormData): ContactFormValues {
  return {
    submissionId: stringField(formData, "submission-id"),
    name: stringField(formData, "name"),
    phone: stringField(formData, "phone"),
    email: stringField(formData, "email"),
    message: stringField(formData, "message"),
    botField: stringField(formData, "bot-field"),
  };
}

export function validateContactDraft(draft: ContactDraft) {
  const parsed = draftSchema.safeParse(draft);
  if (!parsed.success) {
    return {
      success: false as const,
      fieldErrors: parsed.error.flatten().fieldErrors satisfies ContactFieldErrors,
    };
  }
  return { success: true as const, data: parsed.data };
}

export function validateContactValues(values: ContactFormValues) {
  const parsed = actionInputSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false as const,
      fieldErrors: parsed.error.flatten().fieldErrors satisfies ContactFieldErrors,
    };
  }
  return {
    success: true as const,
    data: parsed.data satisfies NormalizedContactSubmission,
  };
}

export function validateContactProviderValues(
  values: Record<string, unknown>,
  expectedFormName: ContactFormName = "contact",
) {
  const parsed = providerInputSchema.safeParse({
    formName: values["form-name"],
    submissionId: values["submission-id"],
    name: values.name,
    phone: values.phone ?? "",
    email: values.email,
    message: values.message,
    botField: values["bot-field"] ?? "",
  });
  if (!parsed.success || parsed.data.formName !== expectedFormName) {
    const flattened = parsed.success ? undefined : parsed.error.flatten().fieldErrors;
    return {
      success: false as const,
      fieldErrors: {
        submissionId: flattened?.submissionId,
        name: flattened?.name,
        phone: flattened?.phone,
        email: flattened?.email,
        message: flattened?.message,
      } satisfies ContactFieldErrors,
    };
  }
  return {
    success: true as const,
    data: {
      submissionId: parsed.data.submissionId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      message: parsed.data.message,
      botField: parsed.data.botField,
    } satisfies NormalizedContactSubmission,
  };
}
