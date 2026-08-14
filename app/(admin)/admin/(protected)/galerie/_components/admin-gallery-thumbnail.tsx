"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { INITIAL_GALLERY_ACTION_STATE } from "@/lib/gallery/types";
import { markGalleryPhotoObjectMissingAction } from "../_actions/gallery-actions";

export function AdminGalleryThumbnail({ photoId, src, width, height, auditable }: { photoId: string; src: string; width: number; height: number; auditable: boolean }) {
  const router = useRouter(); const [missing, setMissing] = useState(false);
  const [state, action] = useActionState(markGalleryPhotoObjectMissingAction, INITIAL_GALLERY_ACTION_STATE);
  useEffect(() => { if (state.status === "repair_required") router.refresh(); }, [router, state.status]);
  return <form action={action} className="admin-gallery-thumbnail"><input type="hidden" name="photoId" value={photoId} />
    {!missing && <Image src={src} alt="" width={width} height={height} sizes="96px" unoptimized onError={() => setMissing(true)} />}
    {missing && auditable && <button className="admin-gallery-thumbnail-audit" type="submit" aria-label="Vérifier le fichier"><span role="status">Fichier indisponible</span><span>Vérifier</span></button>}
    {missing && !auditable && <span role="status">Fichier indisponible</span>}
  </form>;
}
