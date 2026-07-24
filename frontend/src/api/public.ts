import type { MapSettings, RouteLeg, RouteNode } from "../types/api";
import { apiFetch } from "./client";

export interface PublicRouteView {
  name: string;
  start_date: string;
  end_date: string | null;
  round_trip: boolean;
  scheduled_end_date: string;
  node_count: number;
  nodes: RouteNode[];
  legs: RouteLeg[];
  total_distance_m: number;
  total_duration_s: number;
  map: Omit<MapSettings, "routes_enabled">;
}
export interface PublicRouteResponse { locked: boolean; route: PublicRouteView | null; }

export function getPublicRoute(token: string): Promise<PublicRouteResponse> {
  return apiFetch<PublicRouteResponse>(`/api/public/routes/${encodeURIComponent(token)}`);
}
export function unlockPublicRoute(token: string, password: string): Promise<PublicRouteResponse> {
  return apiFetch<PublicRouteResponse>(`/api/public/routes/${encodeURIComponent(token)}/unlock`, { method: "POST", body: JSON.stringify({ password }) });
}
