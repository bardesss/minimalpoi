import type { ImportResult } from "../types/api";
import { apiFetch, fetchBlob } from "./client";

export function importPois(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<ImportResult>("/api/pois/import", { method: "POST", body: form });
}

export function exportPois(): Promise<Blob> {
  return fetchBlob("/api/pois/export", { headers: { Accept: "application/geo+json" } });
}
