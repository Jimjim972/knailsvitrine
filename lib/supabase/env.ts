import { z } from "zod";

const publicSupabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().min(1),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
});

export type PublicSupabaseEnv = {
  url: string;
  publishableKey: string;
};

export function validatePublicSupabaseEnv(input: {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}): PublicSupabaseEnv {
  try {
    const values = publicSupabaseEnvSchema.parse(input);
    const url = new URL(values.NEXT_PUBLIC_SUPABASE_URL);
    const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    const isSecureRemote = url.protocol === "https:";
    const isLocalHttp = url.protocol === "http:" && loopbackHosts.has(url.hostname);

    if (
      (!isSecureRemote && !isLocalHttp)
      || url.username
      || url.password
      || url.pathname !== "/"
      || url.search
      || url.hash
      || url.origin !== values.NEXT_PUBLIC_SUPABASE_URL
      || /service_role|sb_secret_/i.test(values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    ) {
      throw new Error("Invalid transport");
    }

    return {
      url: url.origin,
      publishableKey: values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    };
  } catch {
    throw new Error("Invalid public Supabase configuration");
  }
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  return validatePublicSupabaseEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
