import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteFormModal from "./RouteFormModal";
import type { RouteDetail } from "../../types/api";

const createPlan = vi.fn().mockResolvedValue({ id: 1 });
const updatePlan = vi.fn().mockResolvedValue({ id: 1 });
vi.mock("../../queries/hooks", () => ({
  useCreateRoutePlan: () => ({ mutateAsync: createPlan, isPending: false }),
  useUpdateRoutePlan: () => ({ mutateAsync: updatePlan, isPending: false }),
  usePois: () => ({ data: [{ id: 7, name: "Utrecht", lat: 52.09, lng: 5.12 }] }),
  useSearchPlaces: () => ({ mutateAsync: vi.fn() }),
  usePlaceDraft: () => ({ mutateAsync: vi.fn() }),
  useCreatePoi: () => ({ mutateAsync: vi.fn() }),
}));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const existing: RouteDetail = {
  id: 1, name: "NL", start_date: "2026-07-14", end_date: null, scheduled_end_date: "2026-07-16",
  node_count: 1, created_by: 1, owner_username: "a", team_id: null, team_name: null, round_trip: true, can_edit: true,
  nodes: [{ id: 10, kind: "stop", role: "start", position: 1, nights: null, notes: null, poi_id: null, name: "Urk", lat: 1, lng: 1, arrive_date: null, depart_date: null, inbound_distance_m: null, inbound_duration_s: null }],
  legs: [], attachments: [], total_distance_m: 0, total_duration_s: 0,
};

describe("RouteFormModal", () => {
  it("edit mode prefills the route and saves through the update plan", async () => {
    wrap(<RouteFormModal teams={[]} existing={existing} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText(/edit route/i)).toBeInTheDocument();
    expect((screen.getByLabelText(/route name/i) as HTMLInputElement).value).toBe("NL");
    expect(screen.getByText(/urk/i)).toBeInTheDocument(); // existing start label
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await vi.waitFor(() => expect(updatePlan).toHaveBeenCalledWith(expect.objectContaining({ id: 1, roundTrip: true, start: null, startNodeId: 10 })));
  });

  it("create mode still opens the place chooser and creates", async () => {
    wrap(<RouteFormModal teams={[]} existing={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText(/new route/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /set start place/i }));
    fireEvent.click(screen.getByRole("button", { name: /saved place/i }));
    fireEvent.click(screen.getByRole("button", { name: "Utrecht" }));
    expect(screen.getByText(/utrecht/i)).toBeInTheDocument();
  });
});
