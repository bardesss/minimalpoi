import type { MapSettings, Settings, SettingsUpdate } from "../types/api";
import { apiFetch } from "./client";

export function getSettings(): Promise<MapSettings> {
  return apiFetch<MapSettings>("/api/settings");
}

export function getFullSettings(): Promise<Settings> {
  return apiFetch<Settings>("/api/settings");
}

export function updateSettings(patch: SettingsUpdate): Promise<Settings> {
  return apiFetch<Settings>("/api/settings", { method: "PATCH", body: JSON.stringify(patch) });
}
