import type { ShareInfo } from "../types/api";
import { apiFetch } from "./client";

export interface ShareSettingsBody {
  expires_at?: string | null;
  password?: string;
  remove_password?: boolean;
}
export function putShare(routeId: number, body: ShareSettingsBody): Promise<ShareInfo> {
  return apiFetch<ShareInfo>(`/api/routes/${routeId}/share`, { method: "PUT", body: JSON.stringify(body) });
}
export function regenerateShare(routeId: number): Promise<ShareInfo> {
  return apiFetch<ShareInfo>(`/api/routes/${routeId}/share/regenerate`, { method: "POST" });
}
export function deleteShare(routeId: number): Promise<void> {
  return apiFetch<void>(`/api/routes/${routeId}/share`, { method: "DELETE" });
}
