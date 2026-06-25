import type { VersionInfo } from "../types/api";
import { apiFetch } from "./client";

export function getVersion(): Promise<VersionInfo> {
  return apiFetch<VersionInfo>("/api/version");
}
