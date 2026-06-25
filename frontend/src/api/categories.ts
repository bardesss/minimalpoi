import type { Category, CategoryCreate, CategoryUpdate } from "../types/api";
import { apiFetch } from "./client";

export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/api/categories");
}

export function createCategory(body: CategoryCreate): Promise<Category> {
  return apiFetch<Category>("/api/categories", { method: "POST", body: JSON.stringify(body) });
}

export function updateCategory(id: number, body: CategoryUpdate): Promise<Category> {
  return apiFetch<Category>(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteCategory(id: number): Promise<void> {
  return apiFetch<void>(`/api/categories/${id}`, { method: "DELETE" });
}
