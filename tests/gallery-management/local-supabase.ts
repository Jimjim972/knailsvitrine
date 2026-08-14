import { createClient, type SupabaseClient } from "@supabase/supabase-js";

class UnusedRealtimeTransport {
  constructor() { throw new Error("Realtime is disabled in gallery fixtures"); }
}

export {
  createAuthFixture,
  deleteAuthFixture,
  getLocalSupabaseRuntime,
  revokeSessionsForFixture,
} from "../admin-auth/local-supabase";
export type { AuthFixture, LocalSupabaseRuntime } from "../admin-auth/local-supabase";

export function createGalleryClient(apiUrl: string, publishableKey: string, accessToken?: string): SupabaseClient {
  return createClient(apiUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    realtime: { transport: UnusedRealtimeTransport as never },
  });
}

export async function fetchGalleryImage(baseUrl: string, photoId: string, admin = false) {
  const prefix = admin ? "/api/admin/gallery-images" : "/api/gallery-images";
  return fetch(new URL(`${prefix}/${encodeURIComponent(photoId)}`, baseUrl), {
    cache: "no-store",
    redirect: "manual",
  });
}
