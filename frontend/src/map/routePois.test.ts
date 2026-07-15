import { describe, expect, it } from "vitest";
import { poisNotInRoute } from "./routePois";

const poi = (id: number): any => ({ id, name: `P${id}`, lat: 0, lng: 0, category_id: null });
const node = (poi_id: number | null): any => ({ id: 99, poi_id, kind: "stay", position: 1, name: "n", lat: 0, lng: 0 });

describe("poisNotInRoute", () => {
  it("drops POIs referenced by a node's poi_id", () => {
    expect(poisNotInRoute([poi(1), poi(2), poi(3)], [node(2)]).map((p) => p.id)).toEqual([1, 3]);
  });
  it("keeps all POIs when nodes are ad-hoc (no poi_id)", () => {
    expect(poisNotInRoute([poi(1), poi(2)], [node(null)]).map((p) => p.id)).toEqual([1, 2]);
  });
  it("returns all POIs when there are no nodes", () => {
    expect(poisNotInRoute([poi(1)], []).map((p) => p.id)).toEqual([1]);
  });
  it("returns empty when there are no POIs", () => {
    expect(poisNotInRoute([], [node(1)])).toEqual([]);
  });
});
