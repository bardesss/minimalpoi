import type { Category } from "../types/api";
import { apiFetch } from "./client";

export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/api/categories");
}
