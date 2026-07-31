import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("shows the route's current team even when it's not in the teams prop", async () => {
    const existingWithTeam: RouteDetail = { ...existing, team_id: 42, team_name: "Roaming Crew" };
    wrap(<RouteFormModal teams={[{ id: 2, name: "Other Team" }]} existing={existingWithTeam} onClose={vi.fn()} onSaved={vi.fn()} />);
    const select = screen.getByLabelText(/team \(optional\)/i) as HTMLSelectElement;
    expect(select.value).toBe("42");
    expect(screen.getByRole("option", { name: "Roaming Crew" })).toBeInTheDocument();
  });

  it("create mode still opens the place chooser and creates", async () => {
    wrap(<RouteFormModal teams={[]} existing={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText(/new route/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /set start place/i }));
    fireEvent.click(screen.getByRole("button", { name: /saved place/i }));
    fireEvent.click(screen.getByRole("button", { name: "Utrecht" }));
    expect(screen.getByText(/utrecht/i)).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    wrap(<RouteFormModal teams={[]} existing={existing} onClose={onClose} onSaved={vi.fn()} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  // Stacked-dialog regression: with the nested AddPlaceModal open, a single
  // Escape must close ONLY the top-most dialog (AddPlaceModal), leaving the
  // in-progress route form open — pressing it must not discard the form.
  it("Escape closes only the nested AddPlaceModal, keeping the route form open", async () => {
    const onClose = vi.fn();
    wrap(<RouteFormModal teams={[]} existing={null} onClose={onClose} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /set start place/i }));
    expect(screen.getByRole("dialog", { name: "Set start place" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Set start place" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "New route" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders into document.body, outside any transformed ancestor", () => {
    const { container } = wrap(
      <div style={{ transform: "translateY(100px)" }}>
        <RouteFormModal teams={[]} existing={null} onClose={vi.fn()} onSaved={vi.fn()} />
      </div>,
    );
    const dialog = screen.getByRole("dialog", { name: "New route" });
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  // Regression for the <form> wrap added for Enter-to-submit: pressing Enter
  // in the plain name field should submit the form (native implicit submit),
  // not be swallowed — there's no dedicated action button on this field.
  it("pressing Enter in the name field submits the form and saves", async () => {
    const onSaved = vi.fn();
    wrap(<RouteFormModal teams={[]} existing={existing} onClose={vi.fn()} onSaved={onSaved} />);
    await userEvent.click(screen.getByLabelText(/route name/i));
    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 1 }));
  });
});
