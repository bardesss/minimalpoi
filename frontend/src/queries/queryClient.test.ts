import { describe, expect, it } from "vitest";
import { makeQueryClient } from "./queryClient";

describe("makeQueryClient", () => {
  it("applies a non-zero default staleTime so lists don't refetch on every focus/remount", () => {
    const qc = makeQueryClient();
    expect(qc.getDefaultOptions().queries?.staleTime).toBe(30_000);
  });

  it("returns a fresh client each call", () => {
    expect(makeQueryClient()).not.toBe(makeQueryClient());
  });
});
