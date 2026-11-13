import { describe, expect, it } from "vitest";
import { canModify } from "./permissions";
import type { UserRead } from "../types/api";

const u = (id: number, role: "admin" | "member"): UserRead => ({ id, username: "x", role, preferred_team_id: null, disabled: false, created_at: "" });

describe("canModify", () => {
  it.each([
    [null, 1, false],
    [u(1, "admin"), 2, true],
    [u(2, "member"), 2, true],
    [u(2, "member"), 3, false],
  ] as const)("user %j on item by %i -> %s", (user, createdBy, expected) => {
    expect(canModify(user, createdBy)).toBe(expected);
  });
});
