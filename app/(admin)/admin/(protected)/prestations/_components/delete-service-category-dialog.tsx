"use client";

import { useActionState, useRef } from "react";
import { INITIAL_SERVICE_CATEGORY_ACTION_STATE } from "@/lib/services/types";
import { deleteServiceCategoryAction } from "../_actions/service-category-actions";

export function DeleteServiceCategoryDialog({
  categoryCode,
  categoryName,
  serviceCount,
}: {
  categoryCode: string;
  categoryName: string;
  serviceCount: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState(deleteServiceCategoryAction, INITIAL_SERVICE_CATEGORY_ACTION_STATE);
  const close = () => { dialog.current?.close(); trigger.current?.focus(); };

  return <>
    <button ref={trigger} type="button" className="admin-text-action destructive" onClick={() => { dialog.current?.showModal(); queueMicrotask(() => cancel.current?.focus()); }}>Supprimer</button>
    <dialog ref={dialog} className="admin-delete-dialog" onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => trigger.current?.focus()} aria-labelledby={`delete-category-title-${categoryCode}`}>
      <form action={action}>
        <input type="hidden" name="categoryCode" value={categoryCode} />
        <h2 id={`delete-category-title-${categoryCode}`}>Supprimer la catégorie ?</h2>
        <p><strong>{categoryName}</strong> sera supprimée définitivement.</p>
        {serviceCount > 0 && <p>Elle contient actuellement {serviceCount} prestation{serviceCount > 1 ? "s" : ""}. La suppression sera refusée tant qu’elles n’auront pas été déplacées ou supprimées.</p>}
        {state.status !== "idle" && state.status !== "success" && <p className="admin-status error" role="alert">{state.status === "validation" ? "La demande est invalide." : state.message}</p>}
        <div className="admin-form-actions"><button ref={cancel} type="button" className="admin-button secondary" onClick={close}>Annuler</button><button type="submit" className="admin-button destructive" disabled={pending}>{pending ? "Suppression…" : "Supprimer définitivement"}</button></div>
      </form>
    </dialog>
  </>;
}
