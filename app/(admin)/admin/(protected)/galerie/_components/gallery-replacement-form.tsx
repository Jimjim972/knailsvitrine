"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { GalleryVariant } from "@/lib/gallery/constants";
import { INITIAL_GALLERY_ACTION_STATE, type PreparedImage } from "@/lib/gallery/types";
import { finalizeGalleryPhotoReplacementAction, reserveGalleryPhotoReplacementAction } from "../_actions/gallery-actions";
import { ImagePreparation } from "./image-preparation";

export function GalleryReplacementForm({ photoId, variant }: { photoId: string; variant: GalleryVariant }) {
  const router = useRouter(); const [prepared, setPrepared] = useState<PreparedImage | null>(null); const handled = useRef<string | null>(null);
  const [state, action, pending] = useActionState(reserveGalleryPhotoReplacementAction, INITIAL_GALLERY_ACTION_STATE); const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (state.status !== "pending" || !state.photoId || !state.operationId || !state.uploadPath || !prepared || handled.current === state.operationId) return;
    handled.current = state.operationId; const operation = new FormData(); operation.set("photoId", state.photoId); operation.set("operationId", state.operationId); operation.set("announceSuccess", "true");
    void (async () => {
      try {
        setMessage("Envoi du nouveau WebP vérifié…"); const client = createSupabaseBrowserClient();
        const uploaded = await client.storage.from("galerie").upload(state.uploadPath!, prepared.file, { contentType: "image/webp", upsert: false });
        if (uploaded.error) { setMessage("L’envoi a échoué. Utilisez Réparer depuis la liste."); return; }
        const finalized = await finalizeGalleryPhotoReplacementAction(operation);
        if (finalized.status === "success") { URL.revokeObjectURL(prepared.previewUrl); router.push("/admin/galerie"); return; }
        setMessage("message" in finalized ? finalized.message : "La finalisation a échoué.");
      } catch { setMessage("Le stockage est indisponible. Utilisez Réparer depuis la liste."); }
    })();
  }, [prepared, router, state]);
  return <form action={action} className="admin-service-form"><input type="hidden" name="photoId" value={photoId} />
    <fieldset disabled={pending || state.status === "pending"}><legend>Remplacer le fichier</legend><ImagePreparation onPrepared={setPrepared} variant={variant} disabled={pending || state.status === "pending"} />
      {prepared && <><input type="hidden" name="mimeType" value={prepared.mimeType} /><input type="hidden" name="width" value={prepared.width} /><input type="hidden" name="height" value={prepared.height} /><input type="hidden" name="sizeBytes" value={prepared.sizeBytes} /></>}
    </fieldset>{message && <p className="admin-form-status" role="status">{message}</p>}
    <button className="admin-button secondary" type="submit" disabled={pending || !prepared || state.status === "pending"}>Remplacer l’image</button>
  </form>;
}
