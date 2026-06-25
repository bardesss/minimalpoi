import type { UserCreate, UserRead, UserUpdate } from "../types/api";
import { apiFetch } from "./client";

export function getUsers(): Promise<UserRead[]> {
  return apiFetch<UserRead[]>("/api/users");
}

export function createUser(body: UserCreate): Promise<UserRead> {
  return apiFetch<UserRead>("/api/users", { method: "POST", body: JSON.stringify(body) });
}

export function updateUser(id: number, body: UserUpdate): Promise<UserRead> {
  return apiFetch<UserRead>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteUser(id: number): Promise<void> {
  return apiFetch<void>(`/api/users/${id}`, { method: "DELETE" });
}
