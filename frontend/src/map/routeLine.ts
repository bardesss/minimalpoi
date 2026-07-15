import type { RouteLeg, RouteNode } from "../types/api";
import { decodePolyline } from "./polyline";

export function routeLine(nodes: RouteNode[], legs: RouteLeg[] = []) {
  const points: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: nodes.map((n, order) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [n.lng, n.lat] },
      properties: { order, kind: n.kind, name: n.name, id: n.id },
    })),
  };

  // Trace the path node-by-node, following each leg's real driving geometry when
  // Google supplied one; otherwise draw a straight segment between the pair.
  const legByPair = new Map(legs.map((l) => [`${l.from_node_id}:${l.to_node_id}`, l]));
  const coordinates: [number, number][] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const leg = legByPair.get(`${a.id}:${b.id}`);
    if (leg?.geometry) {
      coordinates.push(...decodePolyline(leg.geometry));
    } else {
      coordinates.push([a.lng, a.lat], [b.lng, b.lat]);
    }
  }

  const line: GeoJSON.Feature<GeoJSON.LineString> | null =
    coordinates.length >= 2
      ? { type: "Feature", geometry: { type: "LineString", coordinates }, properties: {} }
      : null;
  return { line, points };
}
