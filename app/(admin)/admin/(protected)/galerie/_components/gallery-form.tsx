"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { GALLERY_VARIANT_LABELS, GALLERY_VARIANTS, type GalleryVariant } from "@/lib/gallery/constants";
import { INITIAL_GALLERY_ACTION_STATE, type AdminGalleryPhoto, type PreparedImage } from "@/lib/gallery/types";
import { compensateCreateGalleryPhotoAction, finalizeCreateGalleryPhotoAction, reserveCreateGalleryPhotoAction, updateGalleryPhotoAction } from "../_actions/gallery-actions";
import { ImagePreparation } from "./image-preparation";

export function GalleryForm({ mode = "create", photo }: { mode?: "create" | "edit"; photo?: AdminGalleryPhoto }) {
  const router = useRouter();
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [variant, setVariant] = useState<GalleryVariant>(photo?.variant ?? "small");
  const [values, setValues] = useState({
    altText: photo?.altText ?? "",
    title: photo?.title ?? "",
    label: photo?.label ?? "",
    externalUrl: photo?.externalUrl ?? "",
    displayOrder: photo?.displayOrder.toString() ?? "0",
  });
  const [active, setActive] = useState(photo?.active ?? true);
  const updateValue = (name: keyof typeof values, value: string) => setValues((current) => ({ ...current, [name]: value }));
  const [state, action, pending] = useActionState(mode === "create" ? reserveCreateGalleryPhotoAction : updateGalleryPhotoAction, INITIAL_GALLERY_ACTION_STATE);
  const [uploadState, setUploadState] = useState<string | null>(null);
  const handledOperation = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== "create") return;
    if (state.status !== "pending" || !state.photoId || !state.operationId || !state.uploadPath || !prepared || handledOperation.current === state.operationId) return;
    handledOperation.current = state.operationId;
    void (async () => {
      setUploadState("Envoi du WebP vérifié…");
      const operation = new FormData(); operation.set("photoId", state.photoId!); operation.set("operationId", state.operationId!); operation.set("announceSuccess", "true");
      try {
        const supabase = createSupabaseBrowserClient();
        const uploaded = await supabase.storage.from("galerie").upload(state.uploadPath!, prepared.file, { contentType: "image/webp", upsert: false });
        if (uploaded.error) {
          await compensateCreateGalleryPhotoAction(operation); setUploadState("L’envoi a échoué. La réservation a été nettoyée."); return;
        }
        const finalized = await finalizeCreateGalleryPhotoAction(operation);
        if (finalized.status === "success") { URL.revokeObjectURL(prepared.previewUrl); router.push("/admin/galerie"); router.refresh(); return; }
        setUploadState("message" in finalized ? finalized.message : "La finalisation a échoué.");
      } catch {
        await compensateCreateGalleryPhotoAction(operation).catch(() => undefined);
        setUploadState("L’envoi a échoué. Rechargez la page avant de réessayer.");
      }
    })();
  }, [mode, prepared, router, state]);
  useEffect(() => { if (mode === "edit" && state.status === "success") { router.push("/admin/galerie"); router.refresh(); } }, [mode, router, state.status]);
  const errors = state.status === "validation" ? state.fieldErrors : {};
  return <form className="admin-service-form admin-gallery-form" action={action}>
    {photo && <><input type="hidden" name="photoId" value={photo.id} /><input type="hidden" name="updatedAt" value={photo.updatedAt} /></>}
    <fieldset disabled={pending || state.status === "pending"}><legend>Image et publication</legend>
      {mode === "create" && <ImagePreparation onPrepared={setPrepared} variant={variant} disabled={pending || state.status === "pending"} />}
      {prepared && <><input type="hidden" name="mimeType" value={prepared.mimeType} /><input type="hidden" name="width" value={prepared.width} /><input type="hidden" name="height" value={prepared.height} /><input type="hidden" name="sizeBytes" value={prepared.sizeBytes} /></>}
      {errors.image && <p className="admin-field-error" role="alert">{errors.image[0]}</p>}
      <Field label="Texte alternatif" name="altText" required value={values.altText} onChange={(value) => updateValue("altText", value)} error={errors.altText?.[0]} />
      <Field label="Titre, facultatif" name="title" value={values.title} onChange={(value) => updateValue("title", value)} error={errors.title?.[0]} />
      <Field label="Libellé, facultatif" name="label" value={values.label} onChange={(value) => updateValue("label", value)} error={errors.label?.[0]} />
      <Field label="Lien HTTPS, facultatif" name="externalUrl" type="url" value={values.externalUrl} onChange={(value) => updateValue("externalUrl", value)} error={errors.externalUrl?.[0]} />
      <SelectField value={variant} onChange={setVariant} error={errors.variant?.[0]} />
      <Field label="Ordre d’affichage" name="displayOrder" type="number" value={values.displayOrder} onChange={(value) => updateValue("displayOrder", value)} error={errors.displayOrder?.[0]} />
      <CheckboxField checked={active} onChange={setActive} error={errors.active?.[0]} />
    </fieldset>
    {state.status !== "idle" && state.status !== "validation" && state.status !== "pending" && state.status !== "success" && <p className="admin-form-alert" role="alert">{state.message}</p>}
    {errors.photoId && <p className="admin-form-alert" role="alert">{errors.photoId[0]}</p>}
    {uploadState && <p className="admin-form-status" role="status">{uploadState}</p>}
    <div className="admin-form-actions"><Link className="admin-button secondary" href="/admin/galerie">Annuler</Link><button className="admin-button primary" type="submit" disabled={pending || (mode === "create" && !prepared) || state.status === "pending"}>{pending || state.status === "pending" ? "Enregistrement…" : mode === "create" ? "Ajouter la photo" : "Enregistrer"}</button></div>
  </form>;
}

function SelectField({ value, onChange, error }: { value: GalleryVariant; onChange: (variant: GalleryVariant) => void; error?: string }) {
  const errorId = "variant-error";
  return <label className="admin-field"><span>Variante</span><span className="admin-field-control"><select name="variant" value={value} onChange={(event) => onChange(event.target.value as GalleryVariant)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}>{GALLERY_VARIANTS.map((option) => <option key={option} value={option}>{GALLERY_VARIANT_LABELS[option]}</option>)}</select></span>{error && <span className="admin-field-error" id={errorId}>{error}</span>}</label>;
}

function CheckboxField({ checked, onChange, error }: { checked: boolean; onChange: (checked: boolean) => void; error?: string }) {
  const errorId = "active-error";
  return <label className="admin-checkbox"><input type="hidden" name="active" value="false" /><input type="checkbox" name="active" value="true" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} />Photo active après validation{error && <span className="admin-field-error" id={errorId}>{error}</span>}</label>;
}

function Field({ label, name, type = "text", required = false, value, onChange, error }: { label: string; name: string; type?: string; required?: boolean; value: string; onChange: (value: string) => void; error?: string }) {
  const errorId = `${name}-error`;
  return <label className="admin-field"><span>{label}</span><span className="admin-field-control"><input name={name} type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} /></span>{error && <span className="admin-field-error" id={errorId}>{error}</span>}</label>;
}
