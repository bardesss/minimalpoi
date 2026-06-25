import type { ImportResult } from "../types/api";
import { ApiError, apiFetch } from "./client";

export function importPois(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<ImportResult>("/api/pois/import", { method: "POST", body: form });
}

export async function exportPois(): Promise<Blob> {
  const res = await fetch("/api/pois/export", {
    credentials: "include",
    headers: { Accept: "application/geo+json" },
  });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return res.blob();
}
