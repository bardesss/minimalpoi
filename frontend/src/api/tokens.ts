import type { ApiTokenCreated, ApiTokenRead } from "../types/api";
import { apiFetch } from "./client";

export function getTokens(): Promise<ApiTokenRead[]> {
  return apiFetch<ApiTokenRead[]>("/api/tokens");
}

export function createToken(name: string): Promise<ApiTokenCreated> {
  return apiFetch<ApiTokenCreated>("/api/tokens", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function revokeToken(id: number): Promise<void> {
  await apiFetch<void>(`/api/tokens/${id}`, { method: "DELETE" });
}
