import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export { authFixture, expectAdminHome, submitLogin } from "../admin-auth/fixtures";

export const GALLERY_VARIANTS = ["featured", "small", "wide_small", "wide_large", "social"] as const;
export const GALLERY_FILE_STATES = ["ready", "pending", "repair_required"] as const;

export type GalleryFixtureOverrides = Partial<{
  id: string;
  storage_path: string;
  alt_text: string;
  titre: string | null;
  libelle: string | null;
  lien_externe: string | null;
  variante_affichage: (typeof GALLERY_VARIANTS)[number];
  width: number;
  height: number;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  size_bytes: number;
  ordre_affichage: number;
  actif: boolean;
  file_state: (typeof GALLERY_FILE_STATES)[number];
  operation_kind: "create" | "replace" | "delete" | null;
  operation_id: string | null;
  pending_storage_path: string | null;
  pending_width: number | null;
  pending_height: number | null;
  pending_size_bytes: number | null;
  cleanup_storage_path: string | null;
  operation_started_at: string | null;
  repair_code: string | null;
}>;

export function galleryFixture(overrides: GalleryFixtureOverrides = {}) {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    storage_path: overrides.storage_path ?? `photos/${randomUUID()}.webp`,
    alt_text: overrides.alt_text ?? "Photo de manucure K'nails",
    titre: overrides.titre ?? null,
    libelle: overrides.libelle ?? null,
    lien_externe: overrides.lien_externe ?? null,
    variante_affichage: overrides.variante_affichage ?? "small",
    width: overrides.width ?? 1200,
    height: overrides.height ?? 800,
    mime_type: overrides.mime_type ?? "image/webp",
    size_bytes: overrides.size_bytes ?? 128_000,
    ordre_affichage: overrides.ordre_affichage ?? 0,
    actif: overrides.actif ?? true,
    file_state: overrides.file_state ?? "ready",
    operation_kind: overrides.operation_kind ?? null,
    operation_id: overrides.operation_id ?? null,
    pending_storage_path: overrides.pending_storage_path ?? null,
    pending_width: overrides.pending_width ?? null,
    pending_height: overrides.pending_height ?? null,
    pending_size_bytes: overrides.pending_size_bytes ?? null,
    cleanup_storage_path: overrides.cleanup_storage_path ?? null,
    operation_started_at: overrides.operation_started_at ?? null,
    repair_code: overrides.repair_code ?? null,
  };
}

export async function insertGalleryFixtures(client: SupabaseClient, rows: ReturnType<typeof galleryFixture>[]) {
  const { error } = await client.from("photos_galerie").insert(rows);
  if (error) throw new Error("Unable to create gallery fixtures");
  return rows;
}

export async function removeGalleryFixtures(client: SupabaseClient, rows: ReturnType<typeof galleryFixture>[]) {
  const paths = rows.flatMap((row) => [row.storage_path, row.pending_storage_path, row.cleanup_storage_path]).filter(Boolean) as string[];
  if (paths.length > 0) await client.storage.from("galerie").remove([...new Set(paths)]);
  const { error } = await client.from("photos_galerie").delete().in("id", rows.map((row) => row.id));
  if (error) throw new Error("Unable to remove gallery fixtures");
}
