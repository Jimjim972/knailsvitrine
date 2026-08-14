import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function assertUnlinkedLoopbackGalleryTarget(rawUrl, workspace = process.cwd()) {
  const projectRef = join(workspace, "supabase", ".temp", "project-ref");
  if (existsSync(projectRef) && readFileSync(projectRef, "utf8").trim()) throw new Error("Gallery checks refuse a linked Supabase project");
  const url = new URL(rawUrl); const loopback = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (url.protocol !== "http:" || !loopback.has(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Gallery checks require an exact HTTP loopback target");
  return url.origin;
}
