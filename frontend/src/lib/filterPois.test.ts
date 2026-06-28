import { describe, expect, it } from "vitest";
import type { Poi } from "../types/api";
import { filterPois } from "./filterPois";

const mk = (over: Partial<Poi>): Poi => ({ id: 0, name: "", address: null, city: null, country_code: null, lat: 0, lng: 0, category_id: null, tags: [], notes: null, phone: null, email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "", trip_place_id: null, trip_sync_status: "synced", avg_rating: null, rating_count: 0, ...over });

describe("filterPois", () => {
  const pois = [
    mk({ id: 1, name: "Café Modern", address: "Street, Amsterdam", category_id: 1, tags: ["popular"] }),
    mk({ id: 2, name: "Vondelpark", address: "Park, Amsterdam", category_id: 2, tags: ["outdoor"] }),
  ];
  it("returns all when no filters", () => {
    expect(filterPois(pois, "", [])).toHaveLength(2);
  });
  it("matches name/address/tags case-insensitively", () => {
    expect(filterPois(pois, "café", []).map((p) => p.id)).toEqual([1]);
    expect(filterPois(pois, "outdoor", []).map((p) => p.id)).toEqual([2]);
    expect(filterPois(pois, "amsterdam", [])).toHaveLength(2);
  });
  it("filters by category (AND with search)", () => {
    expect(filterPois(pois, "", [2]).map((p) => p.id)).toEqual([2]);
    expect(filterPois(pois, "café", [2])).toHaveLength(0);
  });
});
