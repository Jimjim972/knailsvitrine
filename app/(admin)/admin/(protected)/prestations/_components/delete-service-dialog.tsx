"use client";

import { useActionState, useRef } from "react";
import { trapDialogFocus } from "@/lib/accessibility/dialog-focus";
import { INITIAL_SERVICE_ACTION_STATE } from "@/lib/services/types";
import { deleteServiceAction } from "../_actions/service-actions";

export function DeleteServiceDialog({ serviceId, serviceName }: { serviceId: string; serviceName: string }) {
  const dialog = useRef<HTMLDialogElement>(null); const trigger = useRef<HTMLButtonElement>(null); const cancel = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState(deleteServiceAction, INITIAL_SERVICE_ACTION_STATE);
  const message = state.status === "validation" ? "La demande est invalide." : state.status === "idle" ? "" : state.message;
  const close = () => { dialog.current?.close(); trigger.current?.focus(); };
  return <><button ref={trigger} type="button" className="admin-text-action destructive" onClick={() => { dialog.current?.showModal(); queueMicrotask(() => cancel.current?.focus()); }}>Supprimer</button>
    <dialog ref={dialog} className="admin-delete-dialog" onKeyDown={trapDialogFocus} onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => trigger.current?.focus()} aria-labelledby={`delete-title-${serviceId}`}>
      <form action={action}><input type="hidden" name="serviceId" value={serviceId} /><h2 id={`delete-title-${serviceId}`}>Supprimer la prestation ?</h2><p><strong>{serviceName}</strong> sera supprimée définitivement. Cette action est irréversible.</p>
        {state.status !== "idle" && state.status !== "success" && <p className="admin-status error" role="alert">{message}</p>}
        <div className="admin-form-actions"><button ref={cancel} type="button" className="admin-button secondary" onClick={close}>Annuler</button><button type="submit" className="admin-button destructive" disabled={pending}>{pending ? "Suppression…" : "Supprimer définitivement"}</button></div>
      </form>
    </dialog></>;
}
