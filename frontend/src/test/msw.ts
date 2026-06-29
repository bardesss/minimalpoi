import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { Category, MapSettings, Poi, UserRead } from "../types/api";

const adminUser: UserRead = {
  id: 1,
  username: "admin",
  role: "admin",
  preferred_team_id: null,
  disabled: false,
  created_at: "2026-06-23T00:00:00Z",
};

export const sampleCategories: Category[] = [
  { id: 1, name: "Restaurants", color: "#E1574C", icon: "utensils", created_by: 1, trip_category_id: null, trip_sync_status: "synced" },
  { id: 2, name: "Nature", color: "#2F9E63", icon: "trees", created_by: 1, trip_category_id: null, trip_sync_status: "synced" },
];

export const samplePois: Poi[] = [
  { id: 1, name: "Café Modern", address: "Street 12, Amsterdam", city: "Amsterdam", country_code: "NL", lat: 52.37, lng: 4.9, category_id: 1, tags: ["popular"], notes: null, phone: null, email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "2026-06-23T00:00:00Z", updated_at: "2026-06-23T00:00:00Z", trip_place_id: null, trip_sync_status: "synced", avg_rating: null, rating_count: 0 },
  { id: 2, name: "Vondelpark", address: "Vondelpark, Amsterdam", city: "Amsterdam", country_code: "NL", lat: 52.358, lng: 4.868, category_id: 2, tags: ["outdoor"], notes: null, phone: null, email: null, website: null, image_url: null, source_url: null, created_by: 1, created_at: "2026-06-23T00:00:00Z", updated_at: "2026-06-23T00:00:00Z", trip_place_id: null, trip_sync_status: "synced", avg_rating: null, rating_count: 0 },
];

export const sampleSettings: MapSettings = {
  map_tile_url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  default_map_center_lat: 52.3676,
  default_map_center_lng: 4.9041,
  default_map_zoom: 11,
};

export const handlers = [
  http.get("/api/auth/setup-status", () => HttpResponse.json({ needs_setup: false })),
  http.get("/api/auth/me", () => HttpResponse.json(adminUser)),
  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string };
    if (body.password === "good") return HttpResponse.json({ ...adminUser, username: body.username });
    return HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 });
  }),
  http.post("/api/auth/setup", async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string };
    return HttpResponse.json({ ...adminUser, username: body.username }, { status: 201 });
  }),
  http.post("/api/auth/logout", () => HttpResponse.json({ status: "ok" })),
  http.get("/api/pois", () => HttpResponse.json(samplePois)),
  http.get("/api/categories", () => HttpResponse.json(sampleCategories)),
  http.get("/api/settings", () => HttpResponse.json(sampleSettings)),
  http.post("/api/pois/check-duplicate", () => HttpResponse.json({ duplicate_id: null })),
  http.get("/api/version", () => HttpResponse.json({ current: "dev", latest: null, update_available: false })),
  http.get("/api/pois/:id/visits", () => HttpResponse.json([])),
  http.get("/api/me/visits", () => HttpResponse.json([])),
  http.post("/api/images", () => HttpResponse.json({ url: "/images/stub.webp" }, { status: 201 })),
  http.get("/api/pois/:id/comments", () => HttpResponse.json([])),
  // Background list fetches from the Settings sections; default to empty so any
  // component mounting them (without an explicit override) never 404s.
  http.get("/api/teams", () => HttpResponse.json([])),
  http.get("/api/teams/candidates", () => HttpResponse.json([])),
];

export const server = setupServer(...handlers);
