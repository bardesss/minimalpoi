import { apiFetch } from "./client";

export function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<{ url: string }>("/api/images", { method: "POST", body: form });
}
