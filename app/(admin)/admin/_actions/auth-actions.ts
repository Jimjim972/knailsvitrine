"use server";

import { redirect, RedirectType } from "next/navigation";
import type { LoginState, LogoutState } from "../../../../lib/auth/auth-state";
import {
  runLoginAttempt,
  runLogoutAttempt,
  type AuthActionDependencies,
} from "../../../../lib/auth/auth-actions-core";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

async function productionDependencies(): Promise<AuthActionDependencies> {
  const supabase = await createSupabaseServerClient();
  return {
    signInWithPassword: (credentials) => supabase.auth.signInWithPassword(credentials),
    isCurrentAdmin: async () => {
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
      if (claimsError || typeof claimsData?.claims?.sub !== "string") {
        return { data: null, error: claimsError ?? new Error("missing identity") };
      }
      return await supabase.rpc("is_current_admin");
    },
    signOutLocal: () => supabase.auth.signOut({ scope: "local" }),
  };
}

export async function loginAction(
  previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  void previousState;
  const result = await runLoginAttempt(formData, await productionDependencies());
  if (result.kind === "state") return result.state;
  redirect(result.path, RedirectType.replace);
}

export async function logoutAction(
  previousState: LogoutState,
  formData: FormData,
): Promise<LogoutState> {
  void previousState;
  void formData;
  const dependencies = await productionDependencies();
  const result = await runLogoutAttempt(dependencies.signOutLocal);
  if (result.kind === "state") return result.state;
  redirect("/admin/deconnexion", RedirectType.replace);
}
