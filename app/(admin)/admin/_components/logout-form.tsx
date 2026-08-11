"use client";

import { useActionState } from "react";
import { logoutAction } from "../_actions/auth-actions";
import {
  INITIAL_LOGOUT_STATE,
  type LogoutState,
} from "../../../../lib/auth/auth-state";

type LogoutFormProps = {
  initialState?: LogoutState;
};

export function LogoutForm({ initialState = INITIAL_LOGOUT_STATE }: LogoutFormProps) {
  const [state, formAction, pending] = useActionState(logoutAction, initialState);
  const unavailable = state.status === "unavailable";

  return (
    <form
      className="admin-logout-form"
      action={formAction}
      data-auth-status={state.status}
    >
      {unavailable && (
        <p className="admin-form-alert" role="alert" data-status="unavailable">
          {state.message}
        </p>
      )}
      <p className="admin-form-status" role="status" aria-live="polite">
        {pending ? "Déconnexion en cours…" : ""}
      </p>
      <button className="admin-logout-button" type="submit" disabled={pending}>
        {pending
          ? "Déconnexion en cours…"
          : unavailable
            ? "Réessayer la déconnexion"
            : "Se déconnecter"}
      </button>
    </form>
  );
}
