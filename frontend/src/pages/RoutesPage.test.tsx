import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RoutesPage from "./RoutesPage";
import type { RouteDetail } from "../types/api";

const createAsync = vi.fn().mockResolvedValue({ id: 5 });
const updateAsync = vi.fn().mockResolvedValue({ id: 5 });
const deleteAsync = vi.fn().mockResolvedValue(undefined);
const detail: RouteDetail = {
  id: 5, name: "NL trip", start_date: "2026-07-14", end_date: "2026-07-20",
  scheduled_end_date: "2026-07-16", node_count: 0,
  created_by: 1, owner_username: "admin", nodes: [], legs: [], attachments: [], total_distance_m: 0, total_duration_s: 0,
};

vi.mock("../components/routes/RouteMap", () => ({ default: () => null }));

vi.mock("../components/SettingsModal", () => ({ default: () => null }));

vi.mock("../queries/hooks", () => ({
  useRoutes: () => ({ data: [{ id: 5, name: "NL trip", start_date: "2026-07-14", end_date: "2026-07-20", scheduled_end_date: "2026-07-16", node_count: 0, created_by: 1, owner_username: "admin" }], isLoading: false }),
  useRoute: () => ({ data: detail, isLoading: false }),
  useSettings: () => ({ data: { map_tile_url: "", default_map_center_lat: 52, default_map_center_lng: 4, default_map_zoom: 11, routes_enabled: true } }),
  useCreateRoute: () => ({ mutateAsync: createAsync, isPending: false }),
  useAddNode: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateNode: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteNode: () => ({ mutate: vi.fn(), isPending: false }),
  usePois: () => ({ data: [] }),
  useUploadRouteAttachment: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteRouteAttachment: () => ({ mutate: vi.fn(), isPending: false }),
  useVersion: () => ({ data: { update_available: false } }),
  useUpdateRoute: () => ({ mutateAsync: updateAsync, isPending: false }),
  useDeleteRoute: () => ({ mutateAsync: deleteAsync, isPending: false }),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, username: "admin", role: "admin" }, signOut: vi.fn() }),
}));

beforeEach(() => {
  createAsync.mockClear();
  updateAsync.mockClear();
  deleteAsync.mockClear();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <RoutesPage />
    </MemoryRouter>,
  );
}

describe("RoutesPage", () => {
  it("lists routes and opens the timeline on select", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /NL trip/i }));
    expect(await screen.findByText("Itinerary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add stay/i })).toBeInTheDocument();
  });

  it("creates a route from the form", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/route name/i), { target: { value: "Alps" } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: /create route/i }));
    await waitFor(() => expect(createAsync).toHaveBeenCalledWith({ name: "Alps", start_date: "2026-08-01" }));
  });

  it("shows planned end date with the scheduled hint when they differ", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /NL trip/i }));
    expect(await screen.findByText(/2026-07-20/)).toBeInTheDocument();   // planned end
    expect(screen.getByText(/scheduled:\s*2026-07-16/i)).toBeInTheDocument();
  });

  it("edits a route's name and dates", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /NL trip/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^edit$/i }));
    fireEvent.change(screen.getByLabelText(/edit route name/i), { target: { value: "NL trip 2" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(updateAsync).toHaveBeenCalledWith({ id: 5, body: expect.objectContaining({ name: "NL trip 2" }) }),
    );
  });

  it("deletes a route after confirm", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /NL trip/i }));
    fireEvent.click(await screen.findByRole("button", { name: /delete route/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
    await waitFor(() => expect(deleteAsync).toHaveBeenCalledWith(5));
  });
});
