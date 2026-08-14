"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { INITIAL_GALLERY_ACTION_STATE } from "@/lib/gallery/types";
import { setGalleryPhotoVisibilityAction } from "../_actions/gallery-actions";

export function GalleryVisibilityForm({ photoId, active }: { photoId: string; active: boolean }) {
  const router = useRouter(); const button = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState(setGalleryPhotoVisibilityAction, INITIAL_GALLERY_ACTION_STATE);
  useEffect(() => { if (state.status === "success") { router.refresh(); button.current?.focus(); } }, [router, state.status]);
  return <form action={action} className="admin-inline-action"><input type="hidden" name="photoId" value={photoId} /><input type="hidden" name="active" value={String(!active)} />
    <button ref={button} className="admin-text-action" type="submit" disabled={pending}>{pending ? "Mise à jour…" : active ? "Masquer" : "Réactiver"}</button>
    {state.status !== "idle" && state.status !== "success" && <span className="admin-inline-status error" role="alert">{"message" in state ? state.message : "La demande est invalide."}</span>}
  </form>;
}
