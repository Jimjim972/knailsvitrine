import { z } from "zod";

const EMAIL_REQUIRED = "Saisissez votre adresse e-mail.";
const EMAIL_INVALID = "Saisissez une adresse e-mail valide.";
const PASSWORD_REQUIRED = "Saisissez votre mot de passe.";

export const adminCredentialsSchema = z.object({
  email: z
    .string({ error: EMAIL_REQUIRED })
    .trim()
    .min(1, { error: EMAIL_REQUIRED })
    .max(254, { error: EMAIL_INVALID })
    .email({ error: EMAIL_INVALID })
    .transform((value) => value.toLowerCase()),
  password: z.string({ error: PASSWORD_REQUIRED }).min(1, { error: PASSWORD_REQUIRED }),
});

export type AdminCredentials = z.infer<typeof adminCredentialsSchema>;

export type ParsedAdminCredentials =
  | { success: true; data: AdminCredentials }
  | {
      success: false;
      email: string;
      fieldErrors: { email?: string[]; password?: string[] };
    };

export function parseAdminCredentials(input: {
  email: unknown;
  password: unknown;
}): ParsedAdminCredentials {
  const normalizedEmail = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const result = adminCredentialsSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    email: normalizedEmail.slice(0, 254),
    fieldErrors: result.error.flatten().fieldErrors,
  };
}
