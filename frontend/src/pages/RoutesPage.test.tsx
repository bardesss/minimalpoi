import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RoutesPage from "./RoutesPage";
import type { RouteDetail } from "../types/api";
import { ToastProvider } from "../components/Toast";

const createPlanAsync = vi.fn().mockResolvedValue({ id: 5 });
const deleteAsync = vi.fn().mockResolvedValue(undefined);
const detail: RouteDetail = {
  id: 5, name: "NL trip", start_date: "2026-07-14", end_date: "2026-07-20",
  scheduled_end_date: "2026-07-16", node_count: 0,
  created_by: 1, owner_username: "admin", team_id: 9, team_name: "Ghosts", round_trip: false, can_edit: true,
  nodes: [], legs: [], attachments: [], total_distance_m: 0, total_duration_s: 0,
};

vi.mock("../components/routes/RouteMap", () => ({ default: () => null }));

vi.mock("../components/SettingsModal", () => ({ default: () => null }));

vi.mock("../components/routes/ShareImageModal", () => ({
  default: () => <div data-testid="share-modal" />,
}));

vi.mock("../queries/hooks", () => ({
  useRoutes: () => ({ data: [{ id: 5, name: "NL trip", start_date: "2026-07-14", end_date: "2026-07-20", scheduled_end_date: "2026-07-16", node_count: 0, created_by: 1, owner_username: "admin", team_id: 3, team_name: "Crew" }], isLoading: false }),
  useRoute: () => ({ data: detail, isLoading: false }),
  useSettings: () => ({ data: { map_tile_url: "", default_map_center_lat: 52, default_map_center_lng: 4, default_map_zoom: 11, routes_enabled: true } }),
  useTeams: () => ({ data: [{ id: 3, name: "Crew", created_by: 1, member_ids: [1] }] }),
  useCreateRoutePlan: () => ({ mutateAsync: createPlanAsync, isPending: false }),
  useUpdateRoutePlan: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSearchPlaces: () => ({ mutateAsync: vi.fn() }),
  usePlaceDraft: () => ({ mutateAsync: vi.fn() }),
  useCreatePoi: () => ({ mutateAsync: vi.fn() }),
  useAddNode: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateNode: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteNode: () => ({ mutate: vi.fn(), isPending: false }),
  usePois: () => ({ data: [] }),
  useCategories: () => ({ data: [] }),
  useUploadRouteAttachment: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteRouteAttachment: () => ({ mutate: vi.fn(), isPending: false }),
  useVersion: () => ({ data: { update_available: false } }),
  useDeleteRoute: () => ({ mutateAsync: deleteAsync, isPending: false }),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, username: "admin", role: "admin" }, signOut: vi.fn() }),
}));

vi.mock("../queries/useRouteEvents", () => ({ useRouteEvents: () => {} }));

beforeEach(() => {
  createPlanAsync.mockClear();
  deleteAsync.mockClear();
});

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <RoutesPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

/** Open the New route modal and set the required start place as an ad-hoc point. */
function openModalWithStart(name: string, start: string) {
  fireEvent.click(screen.getByRole("button", { name: /new route/i }));
  fireEvent.change(screen.getByLabelText(/route name/i), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: start } });
  fireEvent.click(screen.getByRole("button", { name: /set start place/i }));
  fireEvent.click(screen.getByRole("button", { name: /enter coordinates/i }));
  fireEvent.change(screen.getByLabelText(/point name/i), { target: { value: "Chamonix" } });
  fireEvent.change(screen.getByLabelText(/^latitude$/i), { target: { value: "45.9" } });
  fireEvent.change(screen.getByLabelText(/^longitude$/i), { target: { value: "6.87" } });
  fireEvent.click(screen.getByRole("button", { name: /add point/i }));
}

describe("RoutesPage", () => {
  it("lists routes and opens the timeline on select", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /NL trip/i }));
    expect(await screen.findByText("Itinerary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add stay/i })).toBeInTheDocument();
  });

  it("creates a route with a required start place, round trip by default", async () => {
    renderPage();
    openModalWithStart("Alps", "2026-08-01");
    fireEvent.click(screen.getByRole("button", { name: /create route/i }));
    await waitFor(() => expect(createPlanAsync).toHaveBeenCalledWith({
      route: { name: "Alps", start_date: "2026-08-01" },
      start: { kind: "stop", role: "start", name: "Chamonix", lat: 45.9, lng: 6.87, nights: null },
      end: null,
    }));
  });

  it("requires a start place before the route can be created", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /new route/i }));
    fireEvent.change(screen.getByLabelText(/route name/i), { target: { value: "Alps" } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: "2026-08-01" } });
    expect(screen.getByRole("button", { name: /create route/i })).toBeDisabled();
  });

  it("adds a custom end place when round trip is unchecked", async () => {
    renderPage();
    openModalWithStart("Alps", "2026-08-01");
    fireEvent.click(screen.getByLabelText(/round trip/i)); // uncheck
    fireEvent.click(screen.getByRole("button", { name: /set end place/i }));
    fireEvent.click(screen.getByRole("button", { name: /enter coordinates/i }));
    fireEvent.change(screen.getByLabelText(/point name/i), { target: { value: "Nice" } });
    fireEvent.change(screen.getByLabelText(/^latitude$/i), { target: { value: "43.7" } });
    fireEvent.change(screen.getByLabelText(/^longitude$/i), { target: { value: "7.26" } });
    fireEvent.click(screen.getByRole("button", { name: /add point/i }));
    fireEvent.click(screen.getByRole("button", { name: /create route/i }));
    await waitFor(() => expect(createPlanAsync).toHaveBeenCalledWith(expect.objectContaining({
      end: { kind: "stop", role: "end", name: "Nice", lat: 43.7, lng: 7.26, nights: null },
    })));
  });

  it("shows planned end date with the scheduled hint when they differ", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /NL trip/i }));
    expect(await screen.findByText(/2026-07-20/)).toBeInTheDocument();   // planned end
    expect(screen.getByText(/scheduled:\s*2026-07-16/i)).toBeInTheDocument();
  });

  it("opens the route form modal in edit mode from the Edit button", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /NL trip/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^edit$/i }));
    expect(screen.getByText(/edit route/i)).toBeInTheDocument();
    expect((screen.getByLabelText(/route name/i) as HTMLInputElement).value).toBe("NL trip");
  });

  it("deletes a route after confirm", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /NL trip/i }));
    fireEvent.click(await screen.findByRole("button", { name: /delete route/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
    await waitFor(() => expect(deleteAsync).toHaveBeenCalledWith(5));
  });

  it("assigns a team when creating a route", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /new route/i }));
    fireEvent.change(screen.getByLabelText(/route name/i), { target: { value: "Alps" } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText(/team \(optional\)/i), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /set start place/i }));
    fireEvent.click(screen.getByRole("button", { name: /enter coordinates/i }));
    fireEvent.change(screen.getByLabelText(/point name/i), { target: { value: "Chamonix" } });
    fireEvent.change(screen.getByLabelText(/^latitude$/i), { target: { value: "45.9" } });
    fireEvent.change(screen.getByLabelText(/^longitude$/i), { target: { value: "6.87" } });
    fireEvent.click(screen.getByRole("button", { name: /add point/i }));
    fireEvent.click(screen.getByRole("button", { name: /create route/i }));
    await waitFor(() =>
      expect(createPlanAsync).toHaveBeenCalledWith(expect.objectContaining({
        route: { name: "Alps", start_date: "2026-08-01", team_id: 3 },
      })),
    );
  });

  it("shows the team badge on a route", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /NL trip/i }));
    expect(await screen.findAllByText(/Ghosts/)).not.toHaveLength(0);
  });

  it("shows a Share image button, disabled for a node-less route", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /NL trip/i }));
    expect(await screen.findByRole("button", { name: /share image/i })).toBeDisabled();
  });

  it("edit route modal offers the caller's teams to reassign", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /NL trip/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^edit$/i }));
    const select = screen.getByLabelText(/team \(optional\)/i) as HTMLSelectElement;
    expect(within(select).getByRole("option", { name: "Crew" })).toBeInTheDocument();
  });
});
