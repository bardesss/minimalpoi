import { describe, expect, it } from "vitest";
import { routeLine } from "./routeLine";

const nodes = [
  { id: 1, kind: "stay", name: "A", lat: 52.3, lng: 4.9, position: 1 },
  { id: 2, kind: "stop", name: "B", lat: 52.1, lng: 5.1, position: 2 },
] as any;

describe("routeLine", () => {
  it("builds one line segment per leg in [lng,lat] order", () => {
    const { line } = routeLine(nodes);
    expect(line.features).toHaveLength(1);
    expect(line.features[0].geometry.coordinates).toEqual([[4.9, 52.3], [5.1, 52.1]]);
  });
  it("numbers points by order and carries kind", () => {
    const { points } = routeLine(nodes);
    expect(points.features).toHaveLength(2);
    expect(points.features[0].properties).toMatchObject({ order: 0, kind: "stay", name: "A" });
  });
  it("has no segments when fewer than 2 nodes", () => {
    expect(routeLine([nodes[0]]).line.features).toHaveLength(0);
  });

  it("uses a leg's decoded polyline geometry when present", () => {
    const legs = [{ from_node_id: 1, to_node_id: 2, geometry: "_p~iF~ps|U_ulLnnqC" }] as any;
    const { line } = routeLine(nodes, legs);
    expect(line.features[0].geometry.coordinates).toEqual([[-120.2, 38.5], [-120.95, 40.7]]);
  });

  it("falls back to a straight segment for legs without geometry", () => {
    const legs = [{ from_node_id: 1, to_node_id: 2, geometry: null }] as any;
    const { line } = routeLine(nodes, legs);
    expect(line.features[0].geometry.coordinates).toEqual([[4.9, 52.3], [5.1, 52.1]]);
  });

  it("keeps one feature per leg when stitching multiple legs", () => {
    const three = [...nodes, { id: 3, kind: "stay", name: "C", lat: 51.9, lng: 5.3, position: 3 }] as any;
    const legs = [
      { from_node_id: 1, to_node_id: 2, geometry: null },
      { from_node_id: 2, to_node_id: 3, geometry: "_p~iF~ps|U_ulLnnqC" },
    ] as any;
    const { line } = routeLine(three, legs);
    expect(line.features).toHaveLength(2);
    expect(line.features[0].geometry.coordinates).toEqual([[4.9, 52.3], [5.1, 52.1]]);
    expect(line.features[1].geometry.coordinates).toEqual([[-120.2, 38.5], [-120.95, 40.7]]);
  });

  it("marks a segment passed when its destination node is passed", () => {
    const { line, points } = routeLine(nodes, [], new Set([2]));
    expect(line.features[0].properties!.passed).toBe(true);   // dest node 2 passed
    expect(points.features[0].properties!.passed).toBe(false); // node 1 not passed
    expect(points.features[1].properties!.passed).toBe(true);  // node 2 passed
  });
});
