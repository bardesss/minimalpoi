import type { UserRead } from "../types/api";

/** Mirrors the backend rule: admins can change anything, others only their own. */
export function canModify(user: UserRead | null, createdBy: number): boolean {
  return !!user && (user.role === "admin" || user.id === createdBy);
}
