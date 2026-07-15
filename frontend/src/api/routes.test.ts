import { describe, expect, it, vi, beforeEach } from "vitest";
import { getRoutes, createRoute, addNode } from "./routes";

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockJson(body: unknown, _ok = true, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
}

describe("routes api", () => {
  it("GET /api/routes", async () => {
    const spy = mockJson([{ id: 1, name: "NL" }]);
    const rows = await getRoutes();
    expect(rows[0].name).toBe("NL");
    expect(spy.mock.calls[0][0]).toBe("/api/routes");
  });

  it("POST create sends name + start_date", async () => {
    const spy = mockJson({ id: 1, name: "NL", nodes: [], legs: [] });
    await createRoute({ name: "NL", start_date: "2026-07-14" });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ name: "NL", start_date: "2026-07-14" });
  });

  it("addNode posts to nested nodes path", async () => {
    const spy = mockJson({ id: 1, nodes: [], legs: [] });
    await addNode(1, { kind: "stop", name: "X", lat: 1, lng: 2 });
    expect(spy.mock.calls[0][0]).toBe("/api/routes/1/nodes");
  });
});
