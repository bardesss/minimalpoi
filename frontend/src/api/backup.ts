import { apiFetch, fetchBlob } from "./client";

export interface RestoreResult {
  restored: Record<string, number>;
}

export function downloadBackup(): Promise<Blob> {
  return fetchBlob("/api/backup");
}

export function restoreBackup(file: File): Promise<RestoreResult> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<RestoreResult>("/api/restore", { method: "POST", body: form });
}
