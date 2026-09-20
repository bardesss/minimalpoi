import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { makeQueryClient } from "./queryClient";

function retryPolicy() {
  const retry = makeQueryClient().getDefaultOptions().queries?.retry;
  if (typeof retry !== "function") throw new Error("expected a retry predicate");
  return retry as (failureCount: number, error: Error) => boolean;
}

describe("makeQueryClient", () => {
  it("applies a non-zero default staleTime so lists don't refetch on every focus/remount", () => {
    const qc = makeQueryClient();
    expect(qc.getDefaultOptions().queries?.staleTime).toBe(30_000);
  });

  it("returns a fresh client each call", () => {
    expect(makeQueryClient()).not.toBe(makeQueryClient());
  });

  it("never retries a 4xx — an unauthorized request stays unauthorized on the third try", () => {
    const retry = retryPolicy();
    expect(retry(0, new ApiError(401, "Not authenticated"))).toBe(false);
    expect(retry(0, new ApiError(403, "Forbidden"))).toBe(false);
    expect(retry(0, new ApiError(404, "Not found"))).toBe(false);
  });

  it("still retries a 5xx, which may well be transient", () => {
    expect(retryPolicy()(0, new ApiError(500, "Boom"))).toBe(true);
  });

  it("still retries a network error carrying no status", () => {
    expect(retryPolicy()(0, new Error("Failed to fetch"))).toBe(true);
  });

  it("gives up after three attempts", () => {
    expect(retryPolicy()(3, new ApiError(500, "Boom"))).toBe(false);
  });
});
