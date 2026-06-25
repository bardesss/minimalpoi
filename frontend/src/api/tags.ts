import type { TagInfo } from "../types/api";
import { apiFetch } from "./client";

export function getTags(): Promise<TagInfo[]> {
  return apiFetch<TagInfo[]>("/api/tags");
}

export function renameTag(oldTag: string, newTag: string): Promise<TagInfo[]> {
  return apiFetch<TagInfo[]>("/api/tags/rename", {
    method: "PATCH",
    body: JSON.stringify({ old: oldTag, new: newTag }),
  });
}

export function deleteTag(tag: string): Promise<TagInfo[]> {
  return apiFetch<TagInfo[]>(`/api/tags/${encodeURIComponent(tag)}`, { method: "DELETE" });
}
