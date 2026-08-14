"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { requireAdminAction } from "@/lib/auth/admin-session";
import { GALLERY_BUCKET, GALLERY_CACHE_TAG, GALLERY_IMAGE_LIMITS } from "@/lib/gallery/constants";
import { validatePublishedWebp } from "@/lib/gallery/published-image-validation";
import type { GalleryActionState } from "@/lib/gallery/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  GALLERY_SUCCESS_FLASH_COOKIE,
  GALLERY_SUCCESS_FLASH_GUARD_COOKIE,
  gallerySuccessCookieOptions,
  issueServiceSuccessFlash,
  requireServiceSuccessFlashSecret,
  type GallerySuccessKind,
} from "@/lib/services/success-flash";
import { galleryFormValues, galleryOperationSchema, galleryPhotoIdSchema, galleryPhotoMutationSchema, galleryReplacementSchema, galleryVisibilitySchema, preparedImageMetadataSchema, validateGalleryFormValues } from "@/lib/validations/gallery";

const SESSION_EXPIRED: GalleryActionState = { status: "session_expired", message: "Votre session a expiré. Reconnectez-vous." };
const INTERNAL = (): GalleryActionState => ({ status: "internal", message: "Une erreur interne est survenue.", correlationId: randomUUID() });

async function withGallerySuccessFlash(state: GalleryActionState, kind: GallerySuccessKind): Promise<GalleryActionState> {
  if (state.status !== "success") return state;
  const proof = issueServiceSuccessFlash(kind, requireServiceSuccessFlashSecret());
  const cookieStore = await cookies();
  cookieStore.set(GALLERY_SUCCESS_FLASH_COOKIE, proof.token, gallerySuccessCookieOptions());
  cookieStore.set(GALLERY_SUCCESS_FLASH_GUARD_COOKIE, proof.guard, gallerySuccessCookieOptions());
  return state;
}

export async function reserveCreateGalleryPhotoAction(_previous: GalleryActionState, formData: FormData): Promise<GalleryActionState> {
  const authorization = await requireAdminAction();
  if (!authorization.authorized) return SESSION_EXPIRED;
  const values = galleryFormValues(formData);
  const fields = validateGalleryFormValues(values);
  const image = preparedImageMetadataSchema.safeParse({ mimeType: formData.get("mimeType"), width: formData.get("width"), height: formData.get("height"), sizeBytes: formData.get("sizeBytes") });
  if (!fields.success || !image.success) return { status: "validation", values, fieldErrors: { ...(!fields.success ? fields.fieldErrors : {}), ...(!image.success ? { image: ["Préparez une image WebP valide."] } : {}) } };
  const photoId = randomUUID(); const operationId = randomUUID(); const uploadId = randomUUID();
  const uploadPath = `photos/${uploadId}.webp`;
  const supabase = await createSupabaseServerClient();
  const inserted = await supabase.from("photos_galerie").insert({
    id: photoId, storage_path: uploadPath, alt_text: fields.data.altText, titre: fields.data.title,
    libelle: fields.data.label, lien_externe: fields.data.externalUrl, variante_affichage: fields.data.variant,
    width: image.data.width, height: image.data.height, mime_type: "image/webp", size_bytes: image.data.sizeBytes,
    ordre_affichage: fields.data.displayOrder, actif: fields.data.active, file_state: "pending", operation_kind: "create",
    operation_id: operationId, pending_storage_path: uploadPath, pending_width: image.data.width,
    pending_height: image.data.height, pending_size_bytes: image.data.sizeBytes, operation_started_at: new Date().toISOString(),
  }).select("id").maybeSingle();
  if (inserted.error || inserted.data?.id !== photoId) return INTERNAL();
  return { status: "pending", message: "Image préparée. Envoi sécurisé en cours…", photoId, operationId, uploadPath, bucket: GALLERY_BUCKET };
}

export async function updateGalleryPhotoAction(_previous: GalleryActionState, formData: FormData): Promise<GalleryActionState> {
  const authorization = await requireAdminAction(); if (!authorization.authorized) return SESSION_EXPIRED;
  const values = galleryFormValues(formData, "update"); const fields = validateGalleryFormValues(values);
  const target = galleryPhotoMutationSchema.safeParse({ photoId: formData.get("photoId"), updatedAt: formData.get("updatedAt") });
  if (!fields.success || !target.success) return { status: "validation", values, fieldErrors: { ...(!fields.success ? fields.fieldErrors : {}), ...(!target.success ? { photoId: ["La photo a changé. Actualisez la page."] } : {}) } };
  const supabase = await createSupabaseServerClient();
  const updated = await supabase.from("photos_galerie").update({
    alt_text: fields.data.altText, titre: fields.data.title, libelle: fields.data.label, lien_externe: fields.data.externalUrl,
    variante_affichage: fields.data.variant, ordre_affichage: fields.data.displayOrder, actif: fields.data.active,
  }).eq("id", target.data.photoId).eq("updated_at", target.data.updatedAt).eq("file_state", "ready").select("id").maybeSingle();
  if (updated.error) return INTERNAL();
  if (!updated.data) return { status: "conflict", message: "La photo a été modifiée. Actualisez avant de réessayer.", values };
  updateTag(GALLERY_CACHE_TAG);
  return withGallerySuccessFlash({ status: "success", message: "La photo a été modifiée.", photoId: updated.data.id }, "gallery-edit");
}

export async function setGalleryPhotoVisibilityAction(_previous: GalleryActionState, formData: FormData): Promise<GalleryActionState> {
  const authorization = await requireAdminAction(); if (!authorization.authorized) return SESSION_EXPIRED;
  const parsed = galleryVisibilitySchema.safeParse({ photoId: formData.get("photoId"), active: formData.get("active") });
  if (!parsed.success) return { status: "validation", fieldErrors: { photoId: ["La demande est invalide."] } };
  const supabase = await createSupabaseServerClient();
  const updated = await supabase.from("photos_galerie").update({ actif: parsed.data.active === "true" }).eq("id", parsed.data.photoId).eq("file_state", "ready").select("id").maybeSingle();
  if (updated.error) return INTERNAL(); if (!updated.data) return { status: "conflict", message: "Cette photo ne peut plus être modifiée." };
  updateTag(GALLERY_CACHE_TAG);
  return withGallerySuccessFlash({ status: "success", message: parsed.data.active === "true" ? "La photo est active." : "La photo est masquée.", photoId: updated.data.id }, parsed.data.active === "true" ? "gallery-show" : "gallery-hide");
}

export async function reserveGalleryPhotoReplacementAction(_previous: GalleryActionState, formData: FormData): Promise<GalleryActionState> {
  const authorization = await requireAdminAction(); if (!authorization.authorized) return SESSION_EXPIRED;
  const parsed = galleryReplacementSchema.safeParse({ photoId: formData.get("photoId"), mimeType: formData.get("mimeType"), width: formData.get("width"), height: formData.get("height"), sizeBytes: formData.get("sizeBytes") });
  if (!parsed.success) return { status: "validation", fieldErrors: { image: ["Préparez une image WebP valide."] } };
  const supabase = await createSupabaseServerClient(); const current = await supabase.from("photos_galerie").select("id,actif,file_state,repair_code").eq("id", parsed.data.photoId).maybeSingle();
  if (current.error || !current.data) return { status: "not_found", message: "Cette photo n’existe plus." };
  if (current.data.file_state !== "ready" && !(current.data.file_state === "repair_required" && current.data.repair_code === "object_missing")) return { status: "conflict", message: "Une autre opération est déjà en cours." };
  const operationId = randomUUID(); const uploadPath = `photos/${randomUUID()}.webp`;
  const reserved = await supabase.from("photos_galerie").update({ file_state: "pending", operation_kind: "replace", operation_id: operationId, operation_started_at: new Date().toISOString(), repair_code: null, pending_storage_path: uploadPath, pending_width: parsed.data.width, pending_height: parsed.data.height, pending_size_bytes: parsed.data.sizeBytes, cleanup_storage_path: null })
    .eq("id", parsed.data.photoId).eq("file_state", current.data.file_state).select("id").maybeSingle();
  if (reserved.error || !reserved.data) return { status: "conflict", message: "La photo a été modifiée. Actualisez avant de réessayer." };
  if (current.data.actif) updateTag(GALLERY_CACHE_TAG);
  return { status: "pending", message: "Remplacement réservé. Envoi en cours…", photoId: reserved.data.id, operationId, uploadPath, bucket: GALLERY_BUCKET };
}

export async function finalizeGalleryPhotoReplacementAction(formData: FormData): Promise<GalleryActionState> {
  const authorization = await requireAdminAction(); if (!authorization.authorized) return SESSION_EXPIRED;
  const parsed = galleryOperationSchema.safeParse({ photoId: formData.get("photoId"), operationId: formData.get("operationId") });
  if (!parsed.success) return { status: "validation", fieldErrors: { operationId: ["Opération invalide."] } };
  const supabase = await createSupabaseServerClient();
  const current = await supabase.from("photos_galerie").select("id,actif,file_state,operation_kind,operation_id,storage_path,pending_storage_path,pending_width,pending_height,pending_size_bytes")
    .eq("id", parsed.data.photoId).maybeSingle(); const row = current.data;
  if (current.error || !row) return { status: "not_found", message: "Cette opération n’existe plus." };
  if ((row.file_state !== "pending" && row.file_state !== "repair_required") || row.operation_kind !== "replace" || row.operation_id !== parsed.data.operationId || !row.pending_storage_path || !row.pending_width || !row.pending_height || !row.pending_size_bytes) return { status: "conflict", message: "Cette opération a déjà changé." };
  const info = await supabase.storage.from(GALLERY_BUCKET).info(row.pending_storage_path);
  if (info.error || !info.data) return await markReplaceRepair(supabase, row.id, row.operation_id, "upload_unconfirmed");
  if (info.data.contentType !== "image/webp" || info.data.size !== row.pending_size_bytes || info.data.size > GALLERY_IMAGE_LIMITS.outputBytes) return await markReplaceRepair(supabase, row.id, row.operation_id, "invalid_object_bytes");
  const downloaded = await supabase.storage.from(GALLERY_BUCKET).download(row.pending_storage_path);
  if (downloaded.error || !downloaded.data) return await markReplaceRepair(supabase, row.id, row.operation_id, "upload_unconfirmed");
  try { validatePublishedWebp(new Uint8Array(await downloaded.data.arrayBuffer()), { width: row.pending_width, height: row.pending_height, sizeBytes: row.pending_size_bytes, mimeType: "image/webp" }); }
  catch { return await markReplaceRepair(supabase, row.id, row.operation_id, "invalid_object_bytes"); }
  const oldPath = row.storage_path;
  const swapped = await supabase.from("photos_galerie").update({ storage_path: row.pending_storage_path, width: row.pending_width, height: row.pending_height, size_bytes: row.pending_size_bytes, mime_type: "image/webp", cleanup_storage_path: oldPath })
    .eq("id", row.id).eq("operation_id", row.operation_id).in("file_state", ["pending", "repair_required"]).select("id").maybeSingle();
  if (swapped.error || !swapped.data) return await markReplaceRepair(supabase, row.id, row.operation_id, "metadata_unconfirmed");
  const removed = await supabase.storage.from(GALLERY_BUCKET).remove([oldPath]);
  if (removed.error) return await markReplaceRepair(supabase, row.id, row.operation_id, "old_file_cleanup");
  const finalized = await supabase.from("photos_galerie").update({ file_state: "ready", operation_kind: null, operation_id: null, operation_started_at: null, pending_storage_path: null, pending_width: null, pending_height: null, pending_size_bytes: null, cleanup_storage_path: null, repair_code: null })
    .eq("id", row.id).eq("operation_id", row.operation_id).select("id").maybeSingle();
  if (finalized.error || !finalized.data) return await markReplaceRepair(supabase, row.id, row.operation_id, "metadata_unconfirmed");
  if (row.actif) updateTag(GALLERY_CACHE_TAG);
  const success: GalleryActionState = { status: "success", message: "La photo a été remplacée.", photoId: row.id };
  return formData.get("announceSuccess") === "true" ? withGallerySuccessFlash(success, "gallery-replace") : success;
}

export async function markGalleryPhotoObjectMissingAction(_previous: GalleryActionState, formData: FormData): Promise<GalleryActionState> {
  const authorization = await requireAdminAction(); if (!authorization.authorized) return SESSION_EXPIRED;
  const parsed = galleryPhotoIdSchema.safeParse(formData.get("photoId")); if (!parsed.success) return { status: "validation", fieldErrors: { photoId: ["Identifiant invalide."] } };
  const supabase = await createSupabaseServerClient(); const current = await supabase.from("photos_galerie").select("id,actif,file_state,operation_id,repair_code,storage_path").eq("id", parsed.data).maybeSingle();
  if (current.error || !current.data) return { status: "not_found", message: "Cette photo n’existe plus." };
  if (current.data.file_state === "repair_required" && current.data.repair_code === "object_missing" && current.data.operation_id) return { status: "repair_required", message: "Le fichier doit être remplacé ou la photo supprimée.", photoId: current.data.id, operationId: current.data.operation_id };
  if (current.data.file_state !== "ready") return { status: "conflict", message: "Une autre opération est déjà en cours." };
  const presence = await inspectStorageObject(supabase, current.data.storage_path);
  if (presence === "unknown") return { status: "network", message: "Le stockage est temporairement indisponible. Réessayez." };
  if (presence === "present") return { status: "success", message: "Le fichier est disponible.", photoId: current.data.id };
  const operationId = randomUUID(); const marked = await supabase.from("photos_galerie").update({ file_state: "repair_required", operation_kind: "replace", operation_id: operationId, operation_started_at: new Date().toISOString(), repair_code: "object_missing" }).eq("id", current.data.id).eq("file_state", "ready").select("id").maybeSingle();
  if (marked.error || !marked.data) return { status: "conflict", message: "La photo a été modifiée. Actualisez avant de réessayer." };
  if (current.data.actif) updateTag(GALLERY_CACHE_TAG);
  return { status: "repair_required", message: "Le fichier doit être remplacé ou la photo supprimée.", photoId: current.data.id, operationId };
}

export async function deleteGalleryPhotoAction(_previous: GalleryActionState, formData: FormData): Promise<GalleryActionState> {
  const authorization = await requireAdminAction(); if (!authorization.authorized) return SESSION_EXPIRED;
  const parsed = galleryPhotoIdSchema.safeParse(formData.get("photoId")); if (!parsed.success) return { status: "validation", fieldErrors: { photoId: ["Identifiant invalide."] } };
  const supabase = await createSupabaseServerClient(); const current = await supabase.from("photos_galerie").select("id,actif,file_state,storage_path").eq("id", parsed.data).maybeSingle();
  if (current.error) return INTERNAL();
  if (!current.data) return withGallerySuccessFlash({ status: "success", message: "La photo est déjà supprimée.", photoId: parsed.data }, "gallery-delete");
  if (current.data.file_state === "pending") return { status: "conflict", message: "Une autre opération est déjà en cours." };
  const operationId = randomUUID(); const started = await supabase.from("photos_galerie").update({ file_state: "pending", operation_kind: "delete", operation_id: operationId, operation_started_at: new Date().toISOString(), repair_code: null, pending_storage_path: null, pending_width: null, pending_height: null, pending_size_bytes: null, cleanup_storage_path: current.data.storage_path })
    .eq("id", current.data.id).eq("file_state", current.data.file_state).select("id").maybeSingle();
  if (started.error || !started.data) return { status: "conflict", message: "La photo a été modifiée. Actualisez avant de réessayer." };
  if (current.data.actif) updateTag(GALLERY_CACHE_TAG);
  return withGallerySuccessFlash(await finalizeDeleteOperation(supabase, current.data.id, operationId, current.data.storage_path), "gallery-delete");
}

export async function finalizeCreateGalleryPhotoAction(formData: FormData): Promise<GalleryActionState> {
  const authorization = await requireAdminAction();
  if (!authorization.authorized) return SESSION_EXPIRED;
  const parsed = galleryOperationSchema.safeParse({ photoId: formData.get("photoId"), operationId: formData.get("operationId") });
  if (!parsed.success) return { status: "validation", fieldErrors: { operationId: ["Opération invalide."] } };
  const supabase = await createSupabaseServerClient();
  const current = await supabase.from("photos_galerie").select("id,actif,file_state,operation_kind,operation_id,pending_storage_path,pending_width,pending_height,pending_size_bytes")
    .eq("id", parsed.data.photoId).maybeSingle();
  const row = current.data;
  if (current.error || !row) return { status: "not_found", message: "Cette opération n’existe plus." };
  if ((row.file_state !== "pending" && row.file_state !== "repair_required") || row.operation_kind !== "create" || row.operation_id !== parsed.data.operationId || !row.pending_storage_path || !row.pending_width || !row.pending_height || !row.pending_size_bytes) {
    return { status: "conflict", message: "Cette opération a déjà changé." };
  }
  const objectInfo = await supabase.storage.from(GALLERY_BUCKET).info(row.pending_storage_path);
  if (objectInfo.error || !objectInfo.data) {
    return await markCreateRepair(supabase, row.id, row.operation_id, "upload_unconfirmed");
  }
  if (objectInfo.data.contentType !== "image/webp" || objectInfo.data.size !== row.pending_size_bytes || objectInfo.data.size > GALLERY_IMAGE_LIMITS.outputBytes) {
    return await markCreateRepair(supabase, row.id, row.operation_id, "invalid_object_bytes");
  }
  const downloaded = await supabase.storage.from(GALLERY_BUCKET).download(row.pending_storage_path);
  if (downloaded.error || !downloaded.data) return await markCreateRepair(supabase, row.id, row.operation_id, "upload_unconfirmed");
  try {
    if (downloaded.data.size > GALLERY_IMAGE_LIMITS.outputBytes) throw new Error("invalid_object_bytes");
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    validatePublishedWebp(bytes, { width: row.pending_width, height: row.pending_height, sizeBytes: row.pending_size_bytes, mimeType: "image/webp" });
  } catch {
    return await markCreateRepair(supabase, row.id, row.operation_id, "invalid_object_bytes");
  }
  const finalized = await supabase.from("photos_galerie").update({
    file_state: "ready", operation_kind: null, operation_id: null, pending_storage_path: null,
    pending_width: null, pending_height: null, pending_size_bytes: null, cleanup_storage_path: null,
    operation_started_at: null, repair_code: null,
  }).eq("id", row.id).eq("operation_id", row.operation_id).in("file_state", ["pending", "repair_required"]).select("id").maybeSingle();
  if (finalized.error || !finalized.data) return await markCreateRepair(supabase, row.id, row.operation_id, "metadata_unconfirmed");
  if (row.actif) updateTag(GALLERY_CACHE_TAG);
  const success: GalleryActionState = { status: "success", message: "La photo a été ajoutée.", photoId: row.id };
  return formData.get("announceSuccess") === "true" ? withGallerySuccessFlash(success, "gallery-create") : success;
}

export async function compensateCreateGalleryPhotoAction(formData: FormData): Promise<GalleryActionState> {
  const authorization = await requireAdminAction();
  if (!authorization.authorized) return SESSION_EXPIRED;
  const parsed = galleryOperationSchema.safeParse({ photoId: formData.get("photoId"), operationId: formData.get("operationId") });
  if (!parsed.success) return { status: "validation", fieldErrors: { operationId: ["Opération invalide."] } };
  const supabase = await createSupabaseServerClient();
  const current = await supabase.from("photos_galerie").select("id,operation_id,operation_kind,pending_storage_path,file_state").eq("id", parsed.data.photoId).maybeSingle();
  if (!current.data) return { status: "success", message: "La réservation est déjà nettoyée.", photoId: parsed.data.photoId };
  if (current.data.operation_id !== parsed.data.operationId || current.data.operation_kind !== "create" || current.data.file_state === "ready") return { status: "conflict", message: "Cette opération a déjà changé." };
  if (current.data.pending_storage_path) {
    const presence = await inspectStorageObject(supabase, current.data.pending_storage_path);
    if (presence === "unknown") return await markCreateRepair(supabase, parsed.data.photoId, parsed.data.operationId, "new_file_cleanup");
    if (presence === "present") {
      const removed = await supabase.storage.from(GALLERY_BUCKET).remove([current.data.pending_storage_path]);
      if (removed.error) return await markCreateRepair(supabase, parsed.data.photoId, parsed.data.operationId, "new_file_cleanup");
    }
  }
  const deleted = await supabase.from("photos_galerie").delete().eq("id", parsed.data.photoId).eq("operation_id", parsed.data.operationId);
  if (deleted.error) return await markCreateRepair(supabase, parsed.data.photoId, parsed.data.operationId, "new_file_cleanup");
  return { status: "success", message: "La réservation a été nettoyée.", photoId: parsed.data.photoId };
}

export async function repairGalleryPhotoAction(_previous: GalleryActionState, formData: FormData): Promise<GalleryActionState> {
  const authorization = await requireAdminAction();
  if (!authorization.authorized) return SESSION_EXPIRED;
  const parsed = galleryOperationSchema.safeParse({ photoId: formData.get("photoId"), operationId: formData.get("operationId") });
  if (!parsed.success) return { status: "validation", fieldErrors: { operationId: ["Opération invalide."] } };
  const supabase = await createSupabaseServerClient();
  const current = await supabase.from("photos_galerie")
    .select("id,file_state,operation_kind,operation_id,pending_storage_path,cleanup_storage_path,storage_path,repair_code")
    .eq("id", parsed.data.photoId).maybeSingle();
  if (current.error) return INTERNAL();
  if (!current.data) return { status: "success", message: "Cette opération est déjà résolue.", photoId: parsed.data.photoId };
  if (current.data.file_state !== "repair_required" || current.data.operation_id !== parsed.data.operationId) {
    return { status: "conflict", message: "Cette opération a déjà changé." };
  }
  if (current.data.operation_kind === "delete") return finalizeDeleteOperation(supabase, current.data.id, current.data.operation_id, current.data.cleanup_storage_path ?? current.data.storage_path);
  if (current.data.operation_kind === "replace") {
    if (current.data.cleanup_storage_path) {
      const removed = await supabase.storage.from(GALLERY_BUCKET).remove([current.data.cleanup_storage_path]);
      if (removed.error) return await markReplaceRepair(supabase, current.data.id, current.data.operation_id, "old_file_cleanup");
      const ready = await clearOperationToReady(supabase, current.data.id, current.data.operation_id);
      if (ready.status === "success") updateTag(GALLERY_CACHE_TAG);
      return ready;
    }
    if (!current.data.pending_storage_path) return { status: "repair_required", message: "Sélectionnez un nouveau fichier ou supprimez la photo.", photoId: current.data.id, operationId: current.data.operation_id };
    const presence = await inspectStorageObject(supabase, current.data.pending_storage_path);
    if (presence === "unknown") return { status: "network", message: "Le stockage est temporairement indisponible. Réessayez." };
    if (presence === "present") {
      const replacementInput = new FormData(); replacementInput.set("photoId", current.data.id); replacementInput.set("operationId", current.data.operation_id);
      const finalized = await finalizeGalleryPhotoReplacementAction(replacementInput); if (finalized.status === "success") return finalized;
      const removed = await supabase.storage.from(GALLERY_BUCKET).remove([current.data.pending_storage_path]);
      if (removed.error) return await markReplaceRepair(supabase, current.data.id, current.data.operation_id, "old_file_cleanup");
    }
    if (current.data.repair_code === "object_missing") return { status: "repair_required", message: "Sélectionnez un nouveau fichier ou supprimez la photo.", photoId: current.data.id, operationId: current.data.operation_id };
    const ready = await clearOperationToReady(supabase, current.data.id, current.data.operation_id); if (ready.status === "success") updateTag(GALLERY_CACHE_TAG); return ready;
  }
  if (current.data.operation_kind !== "create") return { status: "conflict", message: "Cette opération a déjà changé." };
  const path = current.data.pending_storage_path;
  if (!path) {
    const deleted = await supabase.from("photos_galerie").delete().eq("id", current.data.id).eq("operation_id", current.data.operation_id);
    return deleted.error ? await markCreateRepair(supabase, current.data.id, current.data.operation_id, "new_file_cleanup") : { status: "success", message: "La réservation a été nettoyée.", photoId: current.data.id };
  }
  const presence = await inspectStorageObject(supabase, path);
  if (presence === "unknown") return { status: "network", message: "Le stockage est temporairement indisponible. Réessayez." };
  if (presence === "present") {
    const finalizeInput = new FormData(); finalizeInput.set("photoId", current.data.id); finalizeInput.set("operationId", current.data.operation_id);
    const finalized = await finalizeCreateGalleryPhotoAction(finalizeInput);
    if (finalized.status === "success") return finalized;
    if (finalized.status !== "repair_required") return finalized;
    const removed = await supabase.storage.from(GALLERY_BUCKET).remove([path]);
    if (removed.error) return await markCreateRepair(supabase, current.data.id, current.data.operation_id, "new_file_cleanup");
  }
  const deleted = await supabase.from("photos_galerie").delete().eq("id", current.data.id).eq("operation_id", current.data.operation_id);
  if (deleted.error) return await markCreateRepair(supabase, current.data.id, current.data.operation_id, "new_file_cleanup");
  return { status: "success", message: "L’opération interrompue a été nettoyée.", photoId: current.data.id };
}

export async function reconcileStaleGalleryOperationsAction(): Promise<{ status: "success" | "session_expired" | "internal"; changed: number }> {
  const authorization = await requireAdminAction();
  if (!authorization.authorized) return { status: "session_expired", changed: 0 };
  const supabase = await createSupabaseServerClient();
  const threshold = new Date(Date.now() - GALLERY_IMAGE_LIMITS.pendingTimeoutMs).toISOString();
  const pending = await supabase.from("photos_galerie").select("id,operation_id,pending_storage_path,cleanup_storage_path,storage_path")
    .eq("file_state", "pending").lte("operation_started_at", threshold);
  if (pending.error) return { status: "internal", changed: 0 };
  let changed = 0;
  for (const row of pending.data) {
    if (!row.operation_id) continue;
    const path = row.pending_storage_path ?? row.cleanup_storage_path ?? row.storage_path;
    const presence = await inspectStorageObject(supabase, path);
    if (presence === "unknown") continue;
    const repairCode = presence === "absent" ? "stale_pending_no_object" : "stale_pending_object_present";
    const updated = await supabase.from("photos_galerie").update({ file_state: "repair_required", repair_code: repairCode })
      .eq("id", row.id).eq("operation_id", row.operation_id).eq("file_state", "pending");
    if (!updated.error) changed += 1;
  }
  if (changed > 0) updateTag(GALLERY_CACHE_TAG);
  return { status: "success", changed };
}

async function markCreateRepair(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, photoId: string, operationId: string, repairCode: "upload_unconfirmed" | "metadata_unconfirmed" | "invalid_object_bytes" | "new_file_cleanup"): Promise<GalleryActionState> {
  await supabase.from("photos_galerie").update({ file_state: "repair_required", repair_code: repairCode }).eq("id", photoId).eq("operation_id", operationId);
  return { status: "repair_required", message: "L’opération doit être reprise avant publication.", photoId, operationId };
}

async function markReplaceRepair(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, photoId: string, operationId: string, repairCode: "upload_unconfirmed" | "metadata_unconfirmed" | "invalid_object_bytes" | "old_file_cleanup"): Promise<GalleryActionState> {
  await supabase.from("photos_galerie").update({ file_state: "repair_required", repair_code: repairCode }).eq("id", photoId).eq("operation_id", operationId);
  return { status: "repair_required", message: "Le remplacement doit être repris avant publication.", photoId, operationId };
}

async function clearOperationToReady(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, photoId: string, operationId: string): Promise<GalleryActionState> {
  const result = await supabase.from("photos_galerie").update({ file_state: "ready", operation_kind: null, operation_id: null, operation_started_at: null, pending_storage_path: null, pending_width: null, pending_height: null, pending_size_bytes: null, cleanup_storage_path: null, repair_code: null })
    .eq("id", photoId).eq("operation_id", operationId).select("id").maybeSingle();
  return result.error || !result.data ? { status: "repair_required", message: "L’opération doit encore être reprise.", photoId, operationId } : { status: "success", message: "L’opération est réparée.", photoId };
}

async function finalizeDeleteOperation(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, photoId: string, operationId: string, path: string): Promise<GalleryActionState> {
  const presence = await inspectStorageObject(supabase, path);
  if (presence === "unknown") {
    await supabase.from("photos_galerie").update({ file_state: "repair_required", repair_code: "object_delete_unconfirmed" }).eq("id", photoId).eq("operation_id", operationId);
    return { status: "repair_required", message: "La suppression doit être reprise.", photoId, operationId };
  }
  if (presence === "present") {
    const removed = await supabase.storage.from(GALLERY_BUCKET).remove([path]);
    if (removed.error) { await supabase.from("photos_galerie").update({ file_state: "repair_required", repair_code: "object_delete_unconfirmed" }).eq("id", photoId).eq("operation_id", operationId); return { status: "repair_required", message: "La suppression doit être reprise.", photoId, operationId }; }
  }
  const deleted = await supabase.from("photos_galerie").delete().eq("id", photoId).eq("operation_id", operationId).select("id").maybeSingle();
  if (deleted.error || !deleted.data) { await supabase.from("photos_galerie").update({ file_state: "repair_required", repair_code: "row_delete_unconfirmed" }).eq("id", photoId).eq("operation_id", operationId); return { status: "repair_required", message: "La ligne doit encore être supprimée.", photoId, operationId }; }
  updateTag(GALLERY_CACHE_TAG);
  return { status: "success", message: "La photo a été supprimée.", photoId };
}

async function inspectStorageObject(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  path: string,
): Promise<"present" | "absent" | "unknown"> {
  const result = await supabase.storage.from(GALLERY_BUCKET).info(path);
  if (!result.error) return "present";
  const error = result.error as unknown as { status?: number; statusCode?: string | number; code?: string };
  if (error.status === 404 || error.statusCode === 404 || error.statusCode === "404" || error.statusCode === "NoSuchKey" || error.code === "NoSuchKey") return "absent";
  return "unknown";
}
