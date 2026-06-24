import type { DuplicateResult, Poi, PoiCreate, PoiUpdate } from "../types/api";
import { apiFetch } from "./client";

export function getPois(): Promise<Poi[]> {
  return apiFetch<Poi[]>("/api/pois");
}

export function getPoi(id: number): Promise<Poi> {
  return apiFetch<Poi>(`/api/pois/${id}`);
}

export function createPoi(body: PoiCreate): Promise<Poi> {
  return apiFetch<Poi>("/api/pois", { method: "POST", body: JSON.stringify(body) });
}

export function updatePoi(id: number, body: PoiUpdate): Promise<Poi> {
  return apiFetch<Poi>(`/api/pois/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deletePoi(id: number): Promise<void> {
  return apiFetch<void>(`/api/pois/${id}`, { method: "DELETE" });
}

export function checkDuplicate(body: {
  name: string;
  lat?: number | null;
  lng?: number | null;
  source_url?: string | null;
}): Promise<DuplicateResult> {
  return apiFetch<DuplicateResult>("/api/pois/check-duplicate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
