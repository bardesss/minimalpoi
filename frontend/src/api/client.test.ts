import { afterEach, expect, test, vi } from "vitest";
import { apiFetch, fetchBlob, setUnauthorizedHandler } from "./client";

afterEach(() => {
  vi.restoreAllMocks();
  setUnauthorizedHandler(null);
});

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
  const init = call[1] as RequestInit;
  expect(init).toMatchObject({ credentials: "include" });
  expect((init.headers as Headers).get("Accept")).toBe("application/json");
});

test("throws ApiError with status on 401", async () => {
  mockFetch(401, { detail: "Invalid credentials" });
  await expect(apiFetch("/api/auth/me")).rejects.toMatchObject({
    name: "ApiError",
    status: 401,
    message: "Invalid credentials",
  });
});

test("returns undefined on 204", async () => {
  mockFetch(204, null);
  await expect(apiFetch("/api/auth/logout", { method: "POST" })).resolves.toBeUndefined();
});

test("fetchBlob returns a Blob on 200 and sends credentials", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("PK", { status: 200 })),
  );
  const blob = await fetchBlob("/api/backup");
  // Assert on the body rather than `instanceof Blob`: this test stubs fetch with
  // a raw Response, so the blob comes from Node's own Blob constructor, which is
  // a different realm than the test environment's global on some Node versions.
  expect(await blob.text()).toBe("PK");
  expect(blob.size).toBe(2);
  const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
  expect(init).toMatchObject({ credentials: "include" });
});

test("fetchBlob throws ApiError and extracts JSON detail on error", async () => {
  mockFetch(403, { detail: "Export disabled" });
  await expect(fetchBlob("/api/routes/1/export")).rejects.toMatchObject({
    name: "ApiError",
    status: 403,
    message: "Export disabled",
  });
});

test("a 401 on a data endpoint notifies the unauthorized handler", async () => {
  const onUnauthorized = vi.fn();
  setUnauthorizedHandler(onUnauthorized);
  mockFetch(401, { detail: "Not authenticated" });
  await expect(apiFetch("/api/pois")).rejects.toMatchObject({ status: 401 });
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
});

test("a 401 on an auth endpoint does not notify — a bad password is not a dead session", async () => {
  const onUnauthorized = vi.fn();
  setUnauthorizedHandler(onUnauthorized);
  mockFetch(401, { detail: "Invalid credentials" });
  await expect(apiFetch("/api/auth/login", { method: "POST" })).rejects.toMatchObject({ status: 401 });
  expect(onUnauthorized).not.toHaveBeenCalled();
});

test("a 401 on a public share link does not notify — a visitor has no session to end", async () => {
  const onUnauthorized = vi.fn();
  setUnauthorizedHandler(onUnauthorized);
  mockFetch(401, { detail: "Wrong password" });
  await expect(apiFetch("/api/public/routes/abc/unlock", { method: "POST" })).rejects.toMatchObject({ status: 401 });
  expect(onUnauthorized).not.toHaveBeenCalled();
});

test("a non-401 error does not notify the unauthorized handler", async () => {
  const onUnauthorized = vi.fn();
  setUnauthorizedHandler(onUnauthorized);
  mockFetch(500, { detail: "Boom" });
  await expect(apiFetch("/api/pois")).rejects.toMatchObject({ status: 500 });
  expect(onUnauthorized).not.toHaveBeenCalled();
});

test("fetchBlob shares the unauthorized path", async () => {
  const onUnauthorized = vi.fn();
  setUnauthorizedHandler(onUnauthorized);
  mockFetch(401, { detail: "Not authenticated" });
  await expect(fetchBlob("/api/backup")).rejects.toMatchObject({ status: 401 });
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
});

test("a pydantic 422 list shows the first field and message, plus how many more", async () => {
  mockFetch(422, {
    detail: [
      { loc: ["body", "name"], msg: "String should have at most 200 characters", type: "string_too_long" },
      { loc: ["body", "lat"], msg: "Input should be less than or equal to 90", type: "less_than_equal" },
      { loc: ["body", "lng"], msg: "Input should be a valid number", type: "float_parsing" },
    ],
  });
  await expect(apiFetch("/api/pois", { method: "POST", body: "{}" })).rejects.toMatchObject({
    status: 422,
    message: "name: String should have at most 200 characters (+2 more)",
  });
});

test("a single-item 422 list has no '+N more' suffix", async () => {
  mockFetch(422, { detail: [{ loc: ["body", "url"], msg: "Field required", type: "missing" }] });
  await expect(apiFetch("/api/enrich", { method: "POST", body: "{}" })).rejects.toMatchObject({
    message: "url: Field required",
  });
});

test("a slowapi 429 shows its error field", async () => {
  mockFetch(429, { error: "Rate limit exceeded: 20 per 1 minute" });
  await expect(apiFetch("/api/enrich", { method: "POST", body: "{}" })).rejects.toMatchObject({
    status: 429,
    message: "Rate limit exceeded: 20 per 1 minute",
  });
});

test("a plain string detail is shown as-is", async () => {
  mockFetch(409, { detail: "Token limit reached" });
  await expect(apiFetch("/api/tokens", { method: "POST", body: "{}" })).rejects.toMatchObject({
    status: 409,
    message: "Token limit reached",
  });
});
