import { afterEach, expect, test, vi } from "vitest";
import { ApiError, apiFetch } from "./client";

afterEach(() => vi.restoreAllMocks());

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
}

test("returns parsed JSON on 200 and sends credentials", async () => {
  mockFetch(200, { id: 1, username: "ada" });
  const result = await apiFetch<{ id: number; username: string }>("/api/auth/me");
  expect(result).toEqual({ id: 1, username: "ada" });
  const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
  expect(call[0]).toBe("/api/auth/me");
  expect(call[1]).toMatchObject({ credentials: "include" });
});

test("throws ApiError with status on 401", async () => {
  mockFetch(401, { detail: "Invalid credentials" });
  await expect(apiFetch("/api/auth/me")).rejects.toMatchObject({
    name: "ApiError",
    status: 401,
  });
});

test("returns undefined on 204", async () => {
  mockFetch(204, null);
  await expect(apiFetch("/api/auth/logout", { method: "POST" })).resolves.toBeUndefined();
});
