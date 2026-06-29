import { describe, expect, it } from "vitest";
import type { Poi, PoiFilter } from "../types/api";
import { filterPois } from "./filterPois";

const mk = (over: Partial<Poi>): Poi => ({ id: 0, name: "", address: null, city: null, country_code: null, lat: 0, lng: 0, category_id: null, tags: [], notes: null, phone: null, email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", trip_place_id: null, trip_sync_status: "synced", avg_rating: null, rating_count: 0, ...over });

const base: PoiFilter = { search: "", categoryIds: [], visited: "any" };
const f = (over: Partial<PoiFilter>): PoiFilter => ({ ...base, ...over });

describe("filterPois", () => {
  const pois = [
    mk({ id: 1, name: "Café Modern", address: "Street, Amsterdam", category_id: 1, tags: ["popular"] }),
    mk({ id: 2, name: "Vondelpark", address: "Park, Amsterdam", category_id: 2, tags: ["outdoor"] }),
  ];
  const ctx = { myVisitedPoiIds: new Set<number>([1]) };

  it("returns all when no filters", () => {
    expect(filterPois(pois, base, ctx)).toHaveLength(2);
  });
  it("matches name/address/tags case-insensitively", () => {
    expect(filterPois(pois, f({ search: "café" }), ctx).map((p) => p.id)).toEqual([1]);
    expect(filterPois(pois, f({ search: "outdoor" }), ctx).map((p) => p.id)).toEqual([2]);
    expect(filterPois(pois, f({ search: "amsterdam" }), ctx)).toHaveLength(2);
  });
  it("filters by category (AND with search)", () => {
    expect(filterPois(pois, f({ categoryIds: [2] }), ctx).map((p) => p.id)).toEqual([2]);
    expect(filterPois(pois, f({ search: "café", categoryIds: [2] }), ctx)).toHaveLength(0);
  });
  it("filters by visited-by-me", () => {
    expect(filterPois(pois, f({ visited: "visited" }), ctx).map((p) => p.id)).toEqual([1]);
    expect(filterPois(pois, f({ visited: "not" }), ctx).map((p) => p.id)).toEqual([2]);
    expect(filterPois(pois, f({ visited: "any" }), ctx)).toHaveLength(2);
  });
  it("combines visited with search and category", () => {
    expect(filterPois(pois, f({ visited: "visited", search: "café" }), ctx).map((p) => p.id)).toEqual([1]);
    expect(filterPois(pois, f({ visited: "visited", categoryIds: [2] }), ctx)).toHaveLength(0);
  });
});
