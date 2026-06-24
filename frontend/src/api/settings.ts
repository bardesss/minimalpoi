import type { MapSettings } from "../types/api";
import { apiFetch } from "./client";

export function getSettings(): Promise<MapSettings> {
  return apiFetch<MapSettings>("/api/settings");
}
