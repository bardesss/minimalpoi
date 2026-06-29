import type { FeatureCollection, Point } from "geojson";
import type { Poi } from "../types/api";

export function toFeatureCollection(
  pois: Poi[],
  visitedPoiIds: Set<number> = new Set(),
): FeatureCollection<Point, { id: number; category_id: number; visited: boolean }> {
  return {
    type: "FeatureCollection",
    features: pois.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { id: p.id, category_id: p.category_id ?? -1, visited: visitedPoiIds.has(p.id) },
    })),
  };
}
