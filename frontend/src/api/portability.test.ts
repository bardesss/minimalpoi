// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { exportPois, importPois } from "./portability";

// In node environment, set location.href so MSW's fetchProxy can resolve relative URLs
beforeAll(() => {
  Object.defineProperty(globalThis, "location", {
    value: { href: "http://localhost/" },
    configurable: true,
    writable: true,
  });
});

describe("portability api", () => {
  it("importPois posts multipart and returns the result", async () => {
    let contentType = "";
    server.use(
      http.post("/api/pois/import", ({ request }) => {
        contentType = request.headers.get("content-type") ?? "";
        return HttpResponse.json({ created: 2, skipped: 1, errors: [], created_ids: [10, 11] });
      }),
    );
    const file = new File(["name,lat,lng\nA,1,2\n"], "places.csv", { type: "text/csv" });
    const res = await importPois(file);
    expect(res.created).toBe(2);
    expect(res.created_ids).toEqual([10, 11]);
    expect(contentType).toContain("multipart/form-data");
  });

  it("exportPois returns a Blob", async () => {
    server.use(
      http.get("/api/pois/export", () =>
        HttpResponse.text('{"type":"FeatureCollection","features":[]}', {
          headers: { "Content-Type": "application/geo+json" },
        }),
      ),
    );
    const blob = await exportPois();
    expect(blob).toBeInstanceOf(Blob);
    expect(await blob.text()).toContain("FeatureCollection");
  });
});
