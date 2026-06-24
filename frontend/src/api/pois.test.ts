// Use the shared MSW server from test/msw (its lifecycle is managed globally by
// test/setup.ts). A second local setupServer() here would double-intercept each
// request and consume its body twice → "Body is unusable" stderr noise.
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { checkDuplicate, createPoi, deletePoi, getPois, updatePoi } from "./pois";

describe("pois api", () => {
  it("lists pois", async () => {
    server.use(http.get("/api/pois", () => HttpResponse.json([{ id: 1, name: "A" }])));
    const pois = await getPois();
    expect(pois[0].name).toBe("A");
  });

  it("creates a poi via POST", async () => {
    server.use(
      http.post("/api/pois", async ({ request }) => {
        const body = (await request.json()) as { name: string };
        return HttpResponse.json({ id: 9, name: body.name }, { status: 201 });
      }),
    );
    const created = await createPoi({ name: "New", lat: 1, lng: 2 });
    expect(created.id).toBe(9);
  });

  it("updates a poi via PATCH", async () => {
    server.use(http.patch("/api/pois/5", () => HttpResponse.json({ id: 5, name: "Edited" })));
    const updated = await updatePoi(5, { name: "Edited" });
    expect(updated.name).toBe("Edited");
  });

  it("deletes a poi via DELETE (204)", async () => {
    server.use(http.delete("/api/pois/5", () => new HttpResponse(null, { status: 204 })));
    await expect(deletePoi(5)).resolves.toBeUndefined();
  });

  it("checks duplicates", async () => {
    server.use(http.post("/api/pois/check-duplicate", () => HttpResponse.json({ duplicate_id: 7 })));
    const res = await checkDuplicate({ name: "Dup", lat: 1, lng: 2 });
    expect(res.duplicate_id).toBe(7);
  });
});
