import type { FeatureCollection, Point } from "geojson";
import type { Poi } from "../types/api";

export function toFeatureCollection(pois: Poi[]): FeatureCollection<Point, { id: number; category_id: number }> {
  return {
    type: "FeatureCollection",
    features: pois.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { id: p.id, category_id: p.category_id ?? -1 },
    })),
  };
}
