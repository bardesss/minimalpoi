import { describe, expect, it } from "vitest";
import type { Poi } from "../types/api";
import { sortPois } from "./sortPois";

function poi(over: Partial<Poi>): Poi {
  return {
    id: 1, name: "X", address: null, city: null, country_code: null,
    lat: 0, lng: 0, category_id: null, tags: [], notes: null, phone: null,
    email: null, website: null, image_url: null, source_url: null,
    created_by: 1, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    trip_place_id: null, trip_sync_status: "synced",
    avg_rating: null, rating_count: 0,
    ...over,
  } as Poi;
}

const a = poi({ id: 1, name: "Charlie", lat: 0, lng: 0, avg_rating: 3, rating_count: 2 });
const b = poi({ id: 2, name: "alpha", lat: 10, lng: 10, avg_rating: 5, rating_count: 1 });
const c = poi({ id: 3, name: "Bravo", lat: 1, lng: 1, avg_rating: null, rating_count: 0 });

describe("sortPois", () => {
  it("recent: newest id first", () => {
    expect(sortPois([a, b, c], "recent", null).map((p) => p.id)).toEqual([3, 2, 1]);
  });

  it("name: case-insensitive A–Z", () => {
    expect(sortPois([a, b, c], "name", null).map((p) => p.name)).toEqual(["alpha", "Bravo", "Charlie"]);
  });

  it("rating: highest first, unrated last", () => {
    expect(sortPois([a, b, c], "rating", null).map((p) => p.id)).toEqual([2, 1, 3]);
  });

  it("distance: nearest to the map center first", () => {
    const order = sortPois([a, b, c], "distance", { lng: 0, lat: 0 }).map((p) => p.id);
    expect(order).toEqual([1, 3, 2]); // (0,0) then (1,1) then (10,10)
  });

  it("distance with no center falls back to recent", () => {
    expect(sortPois([a, b, c], "distance", null).map((p) => p.id)).toEqual([3, 2, 1]);
  });

  it("does not mutate the input array", () => {
    const input = [a, b, c];
    sortPois(input, "name", null);
    expect(input.map((p) => p.id)).toEqual([1, 2, 3]);
  });
});
