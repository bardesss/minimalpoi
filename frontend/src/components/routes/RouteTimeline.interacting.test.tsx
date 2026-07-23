import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RouteTimeline from "./RouteTimeline";
import type { RouteDetail } from "../../types/api";

function route(): RouteDetail {
  return {
    id: 1, name: "T", start_date: "2026-07-14", end_date: null, round_trip: false,
    scheduled_end_date: "2026-07-14", node_count: 0, created_by: 1, owner_username: "a",
    team_id: null, team_name: null, can_edit: true, nodes: [], legs: [], attachments: [],
    total_distance_m: 0, total_duration_s: 0,
  } as RouteDetail;
}

function renderTimeline(onInteractingChange: (a: boolean) => void) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <RouteTimeline route={route()} canEdit onInteractingChange={onInteractingChange} />
    </QueryClientProvider>,
  );
}

describe("RouteTimeline onInteractingChange", () => {
  it("reports interacting=true when the add-place modal opens and false when it closes", () => {
    const spy = vi.fn();
    renderTimeline(spy);
    // An empty route (no start, no days) renders top-level "+ Add stay" / "+ Add stop".
    fireEvent.click(screen.getByRole("button", { name: "+ Add stop" }));
    expect(spy).toHaveBeenLastCalledWith(true);

    // AddPlaceModal's dismiss control is aria-label="Close" (verified in
    // frontend/src/components/routes/AddPlaceModal.tsx:74).
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(spy).toHaveBeenLastCalledWith(false);
  });
});
