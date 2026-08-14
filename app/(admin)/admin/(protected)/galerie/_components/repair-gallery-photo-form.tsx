"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { INITIAL_GALLERY_ACTION_STATE } from "@/lib/gallery/types";
import { repairGalleryPhotoAction } from "../_actions/gallery-actions";

export function RepairGalleryPhotoForm({ photoId, operationId }: { photoId: string; operationId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(repairGalleryPhotoAction, INITIAL_GALLERY_ACTION_STATE);
  useEffect(() => { if (state.status === "success") router.refresh(); }, [router, state.status]);
  return <form action={action} className="admin-inline-action">
    <input type="hidden" name="photoId" value={photoId} />
    <input type="hidden" name="operationId" value={operationId} />
    <button className="admin-button secondary" type="submit" disabled={pending}>{pending ? "Réparation…" : "Réparer"}</button>
    {state.status !== "idle" && state.status !== "success" && <span className="admin-field-error" role="alert">{"message" in state ? state.message : "La reprise a échoué."}</span>}
  </form>;
}
