import type { PoiDraft } from "../types/api";
import { apiFetch } from "./client";

export function enrichUrl(url: string): Promise<PoiDraft> {
  return apiFetch<PoiDraft>("/api/enrich", { method: "POST", body: JSON.stringify({ url }) });
}
