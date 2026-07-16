import { describe, expect, it } from "vitest";
import { computeInsertPosition } from "./insertPosition";
import type { RouteNode } from "../types/api";

function node(id: number, position: number, lat: number, lng: number): RouteNode {
  return { id, kind: "stop", position, nights: null, notes: null, poi_id: null, name: `N${id}`, lat, lng, arrive_date: null, depart_date: null, inbound_distance_m: null, inbound_duration_s: null };
}

describe("computeInsertPosition", () => {
  it("returns null for an empty route (backend appends)", () => {
    expect(computeInsertPosition([], { lat: 52, lng: 5 })).toBeNull();
  });

  it("appends after a single node", () => {
    const nodes = [node(1, 1, 52, 5)];
    expect(computeInsertPosition(nodes, { lat: 53, lng: 6 })).toBe(2); // 1 + 1
  });

  // West→east chain along a latitude. A POI between the two western nodes
  // should land in that gap, not at the end.
  it("inserts into the cheapest interior gap", () => {
    const nodes = [node(1, 1, 52, 4), node(2, 2, 52, 5), node(3, 3, 52, 9)];
    // poi near lng 4.5 sits between node1 (4) and node2 (5)
    expect(computeInsertPosition(nodes, { lat: 52, lng: 4.5 })).toBe(1.5); // (1 + 2)/2
  });

  it("prepends before the first node when the POI is nearest the start", () => {
    const nodes = [node(1, 1, 52, 5), node(2, 2, 52, 6)];
    expect(computeInsertPosition(nodes, { lat: 52, lng: 3 })).toBe(0); // 1 - 1
  });

  it("appends after the last node when the POI is nearest the end", () => {
    const nodes = [node(1, 1, 52, 5), node(2, 2, 52, 6)];
    expect(computeInsertPosition(nodes, { lat: 52, lng: 9 })).toBe(3); // 2 + 1
  });
});
