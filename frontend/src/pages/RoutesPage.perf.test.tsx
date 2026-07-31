import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RoutesPage from "./RoutesPage";
import type { Poi, RouteDetail, RouteNode } from "../types/api";
import { ToastProvider } from "../components/Toast";

// Stable module-const query data so identity only changes if the component
// itself recreates the array. (React Query gives stable identity at runtime;
// the mock models that.)
const poi = (id: number, name: string): Poi => ({
  id, name, address: null, city: null, country_code: null, lat: 52.3 + id / 100, lng: 4.9,
  category_id: null, tags: [], notes: null, phone: null, email: null, website: null,
  image_url: null, source_url: null, created_by: 1, created_at: "", updated_at: "",
  trip_place_id: null, trip_sync_status: "s", avg_rating: null, rating_count: 0,
});
const pois: Poi[] = [poi(100, "OnRoute"), poi(200, "Nearby")];
const onRouteNode: RouteNode = {
  id: 5, kind: "stop", position: 1, nights: null, notes: null, poi_id: 100,
  name: "OnRoute", lat: 52.31, lng: 4.9, arrive_date: null, depart_date: null,
  inbound_distance_m: 0, inbound_duration_s: 0, role: null,
};
const detail: RouteDetail = {
  id: 5, name: "Trip", start_date: "2099-07-14", end_date: "2099-07-20",
  scheduled_end_date: "2099-07-20", node_count: 1, created_by: 1, owner_username: "admin",
  team_id: null, team_name: null, round_trip: false, can_edit: true,
  nodes: [onRouteNode], legs: [], attachments: [], total_distance_m: 0, total_duration_s: 0,
};

vi.mock("../components/routes/RouteMap", () => ({
  default: (props: Record<string, unknown>) => {
    (globalThis as Record<string, unknown>).__routeMapProps = props;
    return null;
  },
}));
vi.mock("../components/SettingsModal", () => ({ default: () => null }));
vi.mock("../components/routes/ShareImageModal", () => ({ default: () => <div data-testid="share-modal" /> }));
vi.mock("../queries/hooks", () => ({
  useRoutes: () => ({ data: [], isLoading: false }),
  useRoute: () => ({ data: detail, isLoading: false }),
  usePois: () => ({ data: pois }),
  useCategories: () => ({ data: [] }),
  useSettings: () => ({ data: { map_tile_url: "", default_map_center_lat: 52, default_map_center_lng: 4, default_map_zoom: 11, routes_enabled: true } }),
  useTeams: () => ({ data: [] }),
  useAddNode: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateNode: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteNode: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteRoute: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadRouteAttachment: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteRouteAttachment: () => ({ mutate: vi.fn(), isPending: false }),
  useVersion: () => ({ data: { update_available: false } }),
}));
vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, username: "admin", role: "admin" }, signOut: vi.fn() }),
}));
vi.mock("../queries/useRouteEvents", () => ({ useRouteEvents: () => {} }));

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={["/routes/5"]}>
        <Routes>
          <Route path="/routes/:id" element={<RoutesPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => { delete (globalThis as Record<string, unknown>).__routeMapProps; });

describe("RoutesPage nearbyPois identity", () => {
  it("excludes on-route POIs and keeps a stable pois reference across an unrelated re-render", () => {
    renderPage();
    const first = ((globalThis as Record<string, unknown>).__routeMapProps as { pois: Poi[] }).pois;
    expect(first.map((p) => p.id)).toEqual([200]); // 100 is on the route

    // Any unrelated state change re-renders RoutesPage. Opening the share-image
    // modal is a clean trigger that doesn't touch pois or nodes.
    fireEvent.click(screen.getByRole("button", { name: /share image/i }));

    const second = ((globalThis as Record<string, unknown>).__routeMapProps as { pois: Poi[] }).pois;
    expect(second).toBe(first); // memoized — same array, so RouteMap's [pois] effect won't refire
  });
});
