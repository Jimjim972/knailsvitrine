"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trapDialogFocus } from "@/lib/accessibility/dialog-focus";
import { INITIAL_GALLERY_ACTION_STATE } from "@/lib/gallery/types";
import { deleteGalleryPhotoAction } from "../_actions/gallery-actions";

export function DeleteGalleryPhotoDialog({ photoId, name, thumbnailUrl }: { photoId: string; name: string; thumbnailUrl: string }) {
  const router = useRouter(); const dialog = useRef<HTMLDialogElement>(null); const trigger = useRef<HTMLButtonElement>(null); const cancel = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState(deleteGalleryPhotoAction, INITIAL_GALLERY_ACTION_STATE);
  const close = () => { dialog.current?.close(); trigger.current?.focus(); };
  useEffect(() => { if (state.status === "success") { dialog.current?.close(); router.refresh(); } }, [router, state.status]);
  return <><button ref={trigger} className="admin-text-action destructive" type="button" onClick={() => { dialog.current?.showModal(); queueMicrotask(() => cancel.current?.focus()); }}>Supprimer</button>
    <dialog ref={dialog} className="admin-delete-dialog" aria-labelledby={`delete-gallery-${photoId}`} onKeyDown={trapDialogFocus} onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => trigger.current?.focus()}>
      <form action={action}><input type="hidden" name="photoId" value={photoId} /><h2 id={`delete-gallery-${photoId}`}>Supprimer la photo ?</h2>
        <Image src={thumbnailUrl} alt="" width={96} height={96} unoptimized /><p><strong>{name}</strong> et son fichier seront supprimés définitivement.</p>
        {state.status !== "idle" && state.status !== "success" && <p className="admin-status error" role="alert">{"message" in state ? state.message : "La demande est invalide."}</p>}
        <div className="admin-form-actions"><button ref={cancel} className="admin-button secondary" type="button" onClick={close}>Annuler</button><button className="admin-button destructive" type="submit" disabled={pending}>{pending ? "Suppression…" : "Supprimer définitivement"}</button></div>
      </form>
    </dialog></>;
}
