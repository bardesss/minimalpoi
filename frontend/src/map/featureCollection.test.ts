import { describe, expect, it } from "vitest";
import type { Poi } from "../types/api";
import { toFeatureCollection } from "./featureCollection";

const mk = (over: Partial<Poi>): Poi => ({ id: 0, name: "", address: null, city: null, country_code: null, lat: 0, lng: 0, category_id: null, tags: [], notes: null, phone: null, email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", trip_place_id: null, trip_sync_status: "s", avg_rating: null, rating_count: 0, ...over });

describe("toFeatureCollection", () => {
  it("maps lng/lat order and category_id (null -> -1)", () => {
    const fc = toFeatureCollection([mk({ id: 5, lat: 52.37, lng: 4.9, category_id: 2 }), mk({ id: 6, category_id: null })]);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features[0].geometry).toEqual({ type: "Point", coordinates: [4.9, 52.37] });
    expect(fc.features[0].properties).toEqual({ id: 5, category_id: 2 });
    expect(fc.features[1].properties).toEqual({ id: 6, category_id: -1 });
  });
});
