import type { SetupStatus, UserRead } from "../types/api";
import { apiFetch } from "./client";

export function getSetupStatus(): Promise<SetupStatus> {
  return apiFetch<SetupStatus>("/api/auth/setup-status");
}

export function getMe(): Promise<UserRead> {
  return apiFetch<UserRead>("/api/auth/me");
}

export function login(username: string, password: string): Promise<UserRead> {
  return apiFetch<UserRead>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function setup(username: string, password: string): Promise<UserRead> {
  return apiFetch<UserRead>("/api/auth/setup", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<void> {
  await apiFetch<{ status: string }>("/api/auth/logout", { method: "POST" });
}
