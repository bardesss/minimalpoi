import { ApiError, apiFetch } from "./client";

export interface RestoreResult {
  restored: Record<string, number>;
}

export async function downloadBackup(): Promise<Blob> {
  const res = await fetch("/api/backup", { credentials: "include" });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return res.blob();
}

export function restoreBackup(file: File): Promise<RestoreResult> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<RestoreResult>("/api/restore", { method: "POST", body: form });
}
