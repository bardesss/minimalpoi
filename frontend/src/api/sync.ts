import type { SyncConflict, SyncResolve, SyncStatus } from "../types/api";
import { apiFetch } from "./client";

export function getSyncStatus(): Promise<SyncStatus> {
  return apiFetch<SyncStatus>("/api/sync/status");
}

export function getConflicts(): Promise<SyncConflict[]> {
  return apiFetch<SyncConflict[]>("/api/sync/conflicts");
}

export function resolveConflict(body: SyncResolve): Promise<SyncConflict[]> {
  return apiFetch<SyncConflict[]>("/api/sync/resolve", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function syncNow(): Promise<{ ran: boolean; errors?: number }> {
  return apiFetch("/api/sync/now", { method: "POST" });
}
