import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getPublicSupabaseEnv } from "./env";
import { fetchWithSupabaseTimeout } from "./fetch-with-timeout";

export function createPublicSupabaseClient() {
  const { url, publishableKey } = getPublicSupabaseEnv();
  return createClient<Database>(url, publishableKey, {
    global: { fetch: fetchWithSupabaseTimeout },
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}
