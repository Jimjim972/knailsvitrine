"use client";

import { useActionState, useEffect, useRef } from "react";
import { INITIAL_SERVICE_ACTION_STATE } from "@/lib/services/types";
import { setServiceVisibilityAction } from "../_actions/service-actions";

export function ServiceVisibilityForm({ serviceId, active }: { serviceId: string; active: boolean }) {
  const [state, action, pending] = useActionState(setServiceVisibilityAction, INITIAL_SERVICE_ACTION_STATE);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const message = state.status === "validation" ? "La demande est invalide." : state.status === "idle" ? "" : state.message;

  useEffect(() => {
    if (!pending && state.status !== "idle") buttonRef.current?.focus();
  }, [pending, state.status]);

  return <form action={action} className="admin-inline-action"><input type="hidden" name="serviceId" value={serviceId} /><input type="hidden" name="active" value={String(!active)} /><button ref={buttonRef} type="submit" className="admin-text-action" disabled={pending}>{pending ? "Mise à jour…" : active ? "Masquer" : "Réactiver"}</button>{state.status !== "idle" && <span className={state.status === "success" ? "admin-inline-status" : "admin-inline-status error"} role={state.status === "success" ? "status" : "alert"}>{message}</span>}</form>;
}
