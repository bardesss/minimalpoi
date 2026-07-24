import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PublicRoutePage from "./PublicRoutePage";
import { ApiError } from "../api/client";
import type { PublicRouteResponse } from "../api/public";

const getPublicRoute = vi.fn();
const unlockPublicRoute = vi.fn();

vi.mock("../api/public", () => ({
  getPublicRoute: (...args: unknown[]) => getPublicRoute(...args),
  unlockPublicRoute: (...args: unknown[]) => unlockPublicRoute(...args),
}));

vi.mock("../components/routes/RouteMap", () => ({ default: () => <div data-testid="route-map" /> }));

const openRoute: PublicRouteResponse = {
  locked: false,
  route: {
    name: "Alps Loop",
    start_date: "2026-08-01",
    end_date: "2026-08-05",
    round_trip: false,
    scheduled_end_date: "2026-08-05",
    node_count: 1,
    nodes: [
      {
        id: 1, kind: "stop", position: 1, nights: null, notes: null, poi_id: null,
        name: "Chamonix", lat: 45.9, lng: 6.87, arrive_date: null, depart_date: null,
        inbound_distance_m: null, inbound_duration_s: null, day_offset: null, role: "start",
      },
    ],
    legs: [],
    total_distance_m: 0,
    total_duration_s: 0,
    map: { map_tile_url: "", default_map_center_lat: 45.9, default_map_center_lng: 6.87, default_map_zoom: 10 },
  },
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/s/tok"]}>
        <Routes>
          <Route path="/s/:token" element={<PublicRoutePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getPublicRoute.mockReset();
  unlockPublicRoute.mockReset();
});

describe("PublicRoutePage", () => {
  it("renders a read-only route with no edit/add controls", async () => {
    getPublicRoute.mockResolvedValue(openRoute);
    renderPage();
    expect(await screen.findByText("Chamonix")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add stop/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add stay/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove chamonix/i })).not.toBeInTheDocument();
  });

  it("shows a password form when locked and unlocks on submit", async () => {
    getPublicRoute.mockResolvedValue({ locked: true, route: null });
    unlockPublicRoute.mockResolvedValue(openRoute);
    renderPage();
    const input = await screen.findByLabelText(/password/i);
    fireEvent.change(input, { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock/i }));
    await waitFor(() => expect(unlockPublicRoute).toHaveBeenCalledWith("tok", "secret"));
    expect(await screen.findByText("Chamonix")).toBeInTheDocument();
  });

  it("shows incorrect password on a 401", async () => {
    getPublicRoute.mockResolvedValue({ locked: true, route: null });
    unlockPublicRoute.mockRejectedValue(new ApiError(401, "Unauthorized"));
    renderPage();
    const input = await screen.findByLabelText(/password/i);
    fireEvent.change(input, { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock/i }));
    expect(await screen.findByText(/incorrect password/i)).toBeInTheDocument();
  });

  it("shows a not-found message on a 404", async () => {
    getPublicRoute.mockRejectedValue(new ApiError(404, "Not found"));
    renderPage();
    expect(await screen.findByText(/isn't available/i)).toBeInTheDocument();
  });
});
