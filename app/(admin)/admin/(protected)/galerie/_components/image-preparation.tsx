"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { prepareGalleryImage } from "@/lib/gallery/image-processing";
import type { GalleryVariant } from "@/lib/gallery/constants";
import type { PreparedImage } from "@/lib/gallery/types";

export function ImagePreparation({ onPrepared, variant, disabled = false }: { onPrepared: (image: PreparedImage | null) => void; variant: GalleryVariant; disabled?: boolean }) {
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [status, setStatus] = useState("Choisissez un JPEG, PNG ou WebP de 8 Mio maximum.");
  const controller = useRef<AbortController | null>(null);
  const previewUrl = useRef<string | null>(null);
  useEffect(() => () => { controller.current?.abort(); if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);
  async function select(file: File | undefined) {
    controller.current?.abort(); const operation = new AbortController(); controller.current = operation;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); previewUrl.current = null;
    setPrepared(null); onPrepared(null);
    if (!file) { setStatus("Choisissez un JPEG, PNG ou WebP de 8 Mio maximum."); return; }
    setStatus("Conversion et vérification en cours…");
    try {
      const result = await prepareGalleryImage(file, operation.signal);
      if (controller.current !== operation || operation.signal.aborted) { URL.revokeObjectURL(result.previewUrl); return; }
      previewUrl.current = result.previewUrl;
      setPrepared(result); onPrepared(result); setStatus("Image prête à envoyer.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus(error instanceof Error ? error.message : "Cette image ne peut pas être préparée.");
    }
  }
  return <div className="admin-image-preparation">
    <label className="admin-field"><span>Image</span><span className="admin-field-control"><input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={(event) => void select(event.target.files?.[0])} /></span></label>
    <p className="admin-inline-status" role="status">{status}</p>
    {prepared && <figure className="admin-image-preview"><div className="admin-image-preview-frame" data-variant={variant}><Image src={prepared.previewUrl} alt="Aperçu exact de l’image préparée" fill sizes="(max-width: 760px) 100vw, 480px" unoptimized /></div><figcaption>WebP · {prepared.width} × {prepared.height} · {Math.ceil(prepared.sizeBytes / 1024)} Kio · qualité {prepared.quality}</figcaption></figure>}
  </div>;
}
