import { describe, expect, it } from "vitest";
import type { Poi } from "../types/api";
import { boundsOf } from "./bounds";

const mk = (lng: number, lat: number): Poi => ({ id: 0, name: "", address: null, lat, lng, category_id: null, tags: [], notes: null, phone: null, email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", trip_place_id: null, trip_sync_status: "s" });

describe("boundsOf", () => {
  it("returns null for empty", () => {
    expect(boundsOf([])).toBeNull();
  });
  it("computes [[minLng,minLat],[maxLng,maxLat]]", () => {
    expect(boundsOf([mk(4.9, 52.37), mk(4.8, 52.4), mk(5.0, 52.3)])).toEqual([[4.8, 52.3], [5.0, 52.4]]);
  });
});
