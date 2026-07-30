import type {
  RouteAttachment, RouteCreate, RouteDetail, RouteNodeCreate, RouteNodeUpdate,
  RouteSummary, RouteUpdate,
} from "../types/api";
import { apiFetch, fetchBlob } from "./client";
import { routeClientHeaders } from "../lib/clientId";

export function getRoutes(): Promise<RouteSummary[]> {
  return apiFetch<RouteSummary[]>("/api/routes");
}
export function getRoute(id: number): Promise<RouteDetail> {
  return apiFetch<RouteDetail>(`/api/routes/${id}`);
}
export function createRoute(body: RouteCreate): Promise<RouteDetail> {
  return apiFetch<RouteDetail>("/api/routes", { method: "POST", headers: routeClientHeaders(), body: JSON.stringify(body) });
}
export function updateRoute(id: number, body: RouteUpdate): Promise<RouteDetail> {
  return apiFetch<RouteDetail>(`/api/routes/${id}`, { method: "PATCH", headers: routeClientHeaders(), body: JSON.stringify(body) });
}
export function deleteRoute(id: number): Promise<void> {
  return apiFetch<void>(`/api/routes/${id}`, { method: "DELETE", headers: routeClientHeaders() });
}
export function addNode(routeId: number, body: RouteNodeCreate): Promise<RouteDetail> {
  return apiFetch<RouteDetail>(`/api/routes/${routeId}/nodes`, { method: "POST", headers: routeClientHeaders(), body: JSON.stringify(body) });
}
export function updateNode(routeId: number, nodeId: number, body: RouteNodeUpdate): Promise<RouteDetail> {
  return apiFetch<RouteDetail>(`/api/routes/${routeId}/nodes/${nodeId}`, { method: "PATCH", headers: routeClientHeaders(), body: JSON.stringify(body) });
}
export function deleteNode(routeId: number, nodeId: number): Promise<RouteDetail> {
  return apiFetch<RouteDetail>(`/api/routes/${routeId}/nodes/${nodeId}`, { method: "DELETE", headers: routeClientHeaders() });
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
const routeExportUrl = (id: number, format: RouteExportFormat = "geojson") =>
  `/api/routes/${id}/export?format=${format}`;
export function exportRoute(id: number, format: RouteExportFormat = "geojson"): Promise<Blob> {
  return fetchBlob(routeExportUrl(id, format));
}
export const attachmentUrl = (routeId: number, aid: number) => `/api/routes/${routeId}/attachments/${aid}`;
