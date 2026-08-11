import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { AdminAuthorization } from "./auth-state";
import {
  createRequireAdminAction,
  getAdminAuthorizationWith,
} from "./admin-session-core";
import { sanitizeAdminReturnPath } from "./return-path";
import { createSupabaseServerClient } from "../supabase/server";

async function loadAdminAuthorization(): Promise<AdminAuthorization> {
  const supabase = await createSupabaseServerClient();
  return getAdminAuthorizationWith({
    getClaims: async () => {
      const { data, error } = await supabase.auth.getClaims();
      return {
        subject: typeof data?.claims?.sub === "string" ? data.claims.sub : null,
        error,
      };
    },
    isCurrentAdmin: async () => await supabase.rpc("is_current_admin"),
  });
}

export const getAdminAuthorization = cache(loadAdminAuthorization);

export async function requireAdminPage(
  returnPath: string,
): Promise<{ status: "authorized"; userId: string } | { status: "unavailable" }> {
  const authorization = await getAdminAuthorization();
  if (authorization.status === "authorized") {
    return { status: "authorized", userId: authorization.userId };
  }

  if (authorization.status === "unavailable") return { status: "unavailable" };

  if ((await headers()).has("next-action")) {
    return { status: "unavailable" };
  }

  const query = new URLSearchParams({ returnTo: sanitizeAdminReturnPath(returnPath) });
  query.set("session", "expired");
  redirect(`/admin/connexion?${query.toString()}`);
}

export const requireAdminAction = createRequireAdminAction(getAdminAuthorization);
