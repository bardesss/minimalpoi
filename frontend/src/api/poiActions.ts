import type { Comment, CommentCreate, Visit, VisitUpsert } from "../types/api";
import { apiFetch } from "./client";

export function getVisits(poiId: number): Promise<Visit[]> {
  return apiFetch<Visit[]>(`/api/pois/${poiId}/visits`);
}
export function getMyVisits(): Promise<Visit[]> {
  return apiFetch<Visit[]>(`/api/me/visits`);
}
export function upsertVisit(poiId: number, body: VisitUpsert): Promise<Visit> {
  return apiFetch<Visit>(`/api/pois/${poiId}/visit`, { method: "PUT", body: JSON.stringify(body) });
}
export function deleteVisit(poiId: number): Promise<void> {
  return apiFetch<void>(`/api/pois/${poiId}/visit`, { method: "DELETE" });
}

export function getComments(poiId: number): Promise<Comment[]> {
  return apiFetch<Comment[]>(`/api/pois/${poiId}/comments`);
}
export function addComment(poiId: number, body: CommentCreate): Promise<Comment> {
  return apiFetch<Comment>(`/api/pois/${poiId}/comments`, { method: "POST", body: JSON.stringify(body) });
}
export function deleteComment(poiId: number, commentId: number): Promise<void> {
  return apiFetch<void>(`/api/pois/${poiId}/comments/${commentId}`, { method: "DELETE" });
}
