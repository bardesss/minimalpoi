import type { Comment, CommentCreate, Visit, VisitUpsert, Wishlist } from "../types/api";
import { apiFetch } from "./client";

export function getVisits(poiId: number): Promise<Visit[]> {
  return apiFetch<Visit[]>(`/api/pois/${poiId}/visits`);
}
export function upsertVisit(poiId: number, body: VisitUpsert): Promise<Visit> {
  return apiFetch<Visit>(`/api/pois/${poiId}/visit`, { method: "PUT", body: JSON.stringify(body) });
}
export function deleteVisit(poiId: number): Promise<void> {
  return apiFetch<void>(`/api/pois/${poiId}/visit`, { method: "DELETE" });
}

export function getWishlist(poiId: number): Promise<Wishlist[]> {
  return apiFetch<Wishlist[]>(`/api/pois/${poiId}/wishlist`);
}
export function addWishlist(poiId: number): Promise<Wishlist> {
  return apiFetch<Wishlist>(`/api/pois/${poiId}/wishlist`, { method: "PUT" });
}
export function removeWishlist(poiId: number): Promise<void> {
  return apiFetch<void>(`/api/pois/${poiId}/wishlist`, { method: "DELETE" });
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
