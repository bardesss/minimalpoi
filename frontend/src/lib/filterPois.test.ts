import { describe, expect, it } from "vitest";
import type { Poi, PoiFilter } from "../types/api";
import { filterPois, UNCATEGORIZED_ID } from "./filterPois";

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
  it("filters uncategorized places via the sentinel id", () => {
    const local = [
      mk({ id: 1, name: "Has category", category_id: 5 }),
      mk({ id: 2, name: "No category", category_id: null }),
    ];
    const c = { myVisitedPoiIds: new Set<number>() };
    expect(filterPois(local, f({ categoryIds: [UNCATEGORIZED_ID] }), c).map((p) => p.id)).toEqual([2]);
    // Uncategorized can be combined with a real category.
    expect(filterPois(local, f({ categoryIds: [UNCATEGORIZED_ID, 5] }), c).map((p) => p.id)).toEqual([1, 2]);
    // A real-category filter still excludes uncategorized places.
    expect(filterPois(local, f({ categoryIds: [5] }), c).map((p) => p.id)).toEqual([1]);
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

  it("matches city and country by code and full name, accent-insensitive", () => {
    const local = [
      mk({ id: 1, name: "Umai", address: "Urk", city: "Urk", country_code: "NL" }),
      mk({ id: 2, name: "Kafi", address: "Zürich", city: "Zürich", country_code: "CH" }),
    ];
    const c = { myVisitedPoiIds: new Set<number>() };
    expect(filterPois(local, f({ search: "urk" }), c).map((p) => p.id)).toEqual([1]); // city
    expect(filterPois(local, f({ search: "nl" }), c).map((p) => p.id)).toEqual([1]); // country code
    expect(filterPois(local, f({ search: "netherlands" }), c).map((p) => p.id)).toEqual([1]); // country name
    expect(filterPois(local, f({ search: "zurich" }), c).map((p) => p.id)).toEqual([2]); // accent-folded city
    expect(filterPois(local, f({ search: "switzerland" }), c).map((p) => p.id)).toEqual([2]); // country name
  });

  it("tolerates typos in longer queries without false positives", () => {
    const local = [mk({ id: 1, name: "Vondelpark", address: "Amsterdam" })];
    const c = { myVisitedPoiIds: new Set<number>() };
    expect(filterPois(local, f({ search: "amstrdam" }), c).map((p) => p.id)).toEqual([1]); // 1 deletion
    expect(filterPois(local, f({ search: "vondelprak" }), c).map((p) => p.id)).toEqual([1]); // 2 edits
    expect(filterPois(local, f({ search: "xyzq" }), c)).toHaveLength(0);
  });
});
