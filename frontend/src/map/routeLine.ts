import type { RouteNode } from "../types/api";

export function routeLine(nodes: RouteNode[]) {
  const points: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: nodes.map((n, order) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [n.lng, n.lat] },
      properties: { order, kind: n.kind, name: n.name, id: n.id },
    })),
  };
  const line: GeoJSON.Feature<GeoJSON.LineString> | null =
    nodes.length >= 2
      ? {
          type: "Feature",
          geometry: { type: "LineString", coordinates: nodes.map((n) => [n.lng, n.lat]) },
          properties: {},
        }
      : null;
  return { line, points };
}
