import { describe, expect, it } from "vitest";
import { routeLine } from "./routeLine";

const nodes = [
  { id: 1, kind: "stay", name: "A", lat: 52.3, lng: 4.9, position: 1 },
  { id: 2, kind: "stop", name: "B", lat: 52.1, lng: 5.1, position: 2 },
] as any;

describe("routeLine", () => {
  it("builds a LineString in [lng,lat] order", () => {
    const { line } = routeLine(nodes);
    expect(line!.geometry.coordinates).toEqual([[4.9, 52.3], [5.1, 52.1]]);
  });
  it("numbers points by order and carries kind", () => {
    const { points } = routeLine(nodes);
    expect(points.features).toHaveLength(2);
    expect(points.features[0].properties).toMatchObject({ order: 0, kind: "stay", name: "A" });
  });
  it("omits the line when fewer than 2 nodes", () => {
    expect(routeLine([nodes[0]]).line).toBeNull();
  });
});
