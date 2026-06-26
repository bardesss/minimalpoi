import type { PlaceSearchResult, PoiDraft } from "../types/api";
import { apiFetch } from "./client";

export function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  return apiFetch<PlaceSearchResult[]>(`/api/places/search?q=${encodeURIComponent(query)}`);
}

export function getPlaceDraft(placeId: string): Promise<PoiDraft> {
  return apiFetch<PoiDraft>(`/api/places/${encodeURIComponent(placeId)}`);
}
