"use client";

import { useActionState, useEffect, useRef } from "react";
import { loginAction } from "../_actions/auth-actions";
import { INITIAL_LOGIN_STATE, type LoginState } from "../../../../lib/auth/auth-state";

type LoginFormProps = {
  returnTo: string;
  initialState?: LoginState;
};

export function LoginForm({ returnTo, initialState = INITIAL_LOGIN_STATE }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status !== "idle" && passwordRef.current) passwordRef.current.value = "";
    if (state.status === "validation") {
      if (state.fieldErrors.email) emailRef.current?.focus();
      else if (state.fieldErrors.password) passwordRef.current?.focus();
    }
  }, [state]);

  const emailErrors = state.status === "validation" ? state.fieldErrors.email : undefined;
  const passwordErrors = state.status === "validation" ? state.fieldErrors.password : undefined;
  const formMessage = "message" in state ? state.message : "";

  return (
    <form className="admin-auth-form" action={formAction} data-auth-status={state.status} noValidate>
      <input type="hidden" name="returnTo" value={returnTo} />

      <div className="admin-field-group">
        <label htmlFor="admin-email">Adresse e-mail</label>
        <input
          ref={emailRef}
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.email}
          aria-invalid={emailErrors ? true : undefined}
          aria-describedby={emailErrors ? "admin-email-error" : undefined}
          required
        />
        {emailErrors && (
          <p className="admin-field-error" id="admin-email-error">
            {emailErrors[0]}
          </p>
        )}
      </div>

      <div className="admin-field-group">
        <label htmlFor="admin-password">Mot de passe</label>
        <input
          ref={passwordRef}
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={passwordErrors ? true : undefined}
          aria-describedby={passwordErrors ? "admin-password-error" : undefined}
          required
        />
        {passwordErrors && (
          <p className="admin-field-error" id="admin-password-error">
            {passwordErrors[0]}
          </p>
        )}
      </div>

      {formMessage && (
        <p className="admin-form-alert" role="alert" data-status={state.status}>
          {formMessage}
        </p>
      )}

      <p className="admin-form-status" role="status" aria-live="polite">
        {pending ? "Connexion en cours…" : ""}
      </p>

      <button className="primary-button admin-submit" type="submit" disabled={pending}>
        {pending ? "Connexion en cours…" : "Se connecter"}
      </button>
    </form>
  );
}
