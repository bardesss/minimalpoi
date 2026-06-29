import type { MapSettings, Settings, SettingsUpdate } from "../types/api";
import { apiFetch } from "./client";

export function getSettings(): Promise<MapSettings> {
  // Map-only payload, readable by any member (the full /api/settings is admin-only).
  return apiFetch<MapSettings>("/api/settings/map");
}

export function getFullSettings(): Promise<Settings> {
  return apiFetch<Settings>("/api/settings");
}

export function updateSettings(patch: SettingsUpdate): Promise<Settings> {
  return apiFetch<Settings>("/api/settings", { method: "PATCH", body: JSON.stringify(patch) });
}
