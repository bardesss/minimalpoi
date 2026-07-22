import type {
  RouteAttachment, RouteCreate, RouteDetail, RouteNodeCreate, RouteNodeUpdate,
  RouteSummary, RouteUpdate,
} from "../types/api";
import { ApiError, apiFetch } from "./client";

export function getRoutes(): Promise<RouteSummary[]> {
  return apiFetch<RouteSummary[]>("/api/routes");
}
export function getRoute(id: number): Promise<RouteDetail> {
  return apiFetch<RouteDetail>(`/api/routes/${id}`);
}
export function createRoute(body: RouteCreate): Promise<RouteDetail> {
  return apiFetch<RouteDetail>("/api/routes", { method: "POST", body: JSON.stringify(body) });
}
export function updateRoute(id: number, body: RouteUpdate): Promise<RouteDetail> {
  return apiFetch<RouteDetail>(`/api/routes/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}
export function deleteRoute(id: number): Promise<void> {
  return apiFetch<void>(`/api/routes/${id}`, { method: "DELETE" });
}
export function addNode(routeId: number, body: RouteNodeCreate): Promise<RouteDetail> {
  return apiFetch<RouteDetail>(`/api/routes/${routeId}/nodes`, { method: "POST", body: JSON.stringify(body) });
}
export function updateNode(routeId: number, nodeId: number, body: RouteNodeUpdate): Promise<RouteDetail> {
  return apiFetch<RouteDetail>(`/api/routes/${routeId}/nodes/${nodeId}`, { method: "PATCH", body: JSON.stringify(body) });
}
export function deleteNode(routeId: number, nodeId: number): Promise<RouteDetail> {
  return apiFetch<RouteDetail>(`/api/routes/${routeId}/nodes/${nodeId}`, { method: "DELETE" });
}
export function uploadRouteAttachment(routeId: number, file: File, nodeId?: number): Promise<RouteAttachment> {
  const form = new FormData();
  form.append("file", file);
  if (nodeId != null) form.append("node_id", String(nodeId));
  return apiFetch<RouteAttachment>(`/api/routes/${routeId}/attachments`, { method: "POST", body: form });
}
export function deleteRouteAttachment(routeId: number, aid: number): Promise<void> {
  return apiFetch<void>(`/api/routes/${routeId}/attachments/${aid}`, { method: "DELETE" });
}
export type RouteExportFormat = "geojson" | "gpx" | "kml";
export const routeExportUrl = (id: number, format: RouteExportFormat = "geojson") =>
  `/api/routes/${id}/export?format=${format}`;
export async function exportRoute(id: number, format: RouteExportFormat = "geojson"): Promise<Blob> {
  const res = await fetch(routeExportUrl(id, format), { credentials: "include" });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return res.blob();
}
export const attachmentUrl = (routeId: number, aid: number) => `/api/routes/${routeId}/attachments/${aid}`;
