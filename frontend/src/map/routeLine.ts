import type { RouteLeg, RouteNode } from "../types/api";
import { decodePolyline } from "./polyline";

export function routeLine(nodes: RouteNode[], legs: RouteLeg[] = [], passedNodeIds: Set<number> = new Set()) {
  let seq = 0;
  const points: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: nodes.map((n, order) => {
      const properties: Record<string, unknown> = {
        order, kind: n.kind, name: n.name, id: n.id, passed: passedNodeIds.has(n.id),
      };
      // Role nodes (start/end) get a glyph; every other node gets the next
      // sequence number. This counter is the numbering the itinerary mirrors.
      if (n.role) properties.role = n.role;
      else properties.seq = ++seq;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [n.lng, n.lat] },
        properties,
      };
    }),
  };

  // One segment feature per leg, following the leg's real driving geometry when
  // Google supplied one; otherwise a straight line between the pair. A segment
  // is "passed" iff the node it drives INTO is passed — matching how a day's
  // driving total attributes the inbound leg.
  const legByPair = new Map(legs.map((l) => [`${l.from_node_id}:${l.to_node_id}`, l]));
  const segments: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const leg = legByPair.get(`${a.id}:${b.id}`);
    const coordinates: [number, number][] = leg?.geometry
      ? decodePolyline(leg.geometry)
      : [[a.lng, a.lat], [b.lng, b.lat]];
    segments.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates },
      properties: { passed: passedNodeIds.has(b.id) },
    });
  }

  const line: GeoJSON.FeatureCollection<GeoJSON.LineString> = { type: "FeatureCollection", features: segments };
  return { line, points };
}
