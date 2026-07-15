import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RouteNodeRow from "./RouteNodeRow";
import type { RouteNode } from "../../types/api";

const update = vi.fn();
const del = vi.fn();
vi.mock("../../queries/hooks", () => ({
  useUpdateNode: () => ({ mutate: update, isPending: false }),
  useDeleteNode: () => ({ mutate: del, isPending: false }),
}));

beforeEach(() => {
  update.mockClear();
  del.mockClear();
});

const stay: RouteNode = {
  id: 5, kind: "stay", position: 1, nights: 2, notes: null, poi_id: null,
  name: "Amsterdam", lat: 52.3, lng: 4.9,
  arrive_date: "2026-07-14", depart_date: "2026-07-16",
  inbound_distance_m: 0, inbound_duration_s: 0,
};

describe("RouteNodeRow", () => {
  it("shows a stay with its date range and nights", () => {
    render(<RouteNodeRow node={stay} routeId={1} canEdit isFirst isLast={false} onMove={vi.fn()} />);
    expect(screen.getByText("Amsterdam")).toBeInTheDocument();
    expect(screen.getByText("2026-07-14 → 2026-07-16")).toBeInTheDocument();
    expect(screen.getByText(/2 nights/)).toBeInTheDocument();
  });

  it("nights stepper calls the update mutation", () => {
    render(<RouteNodeRow node={stay} routeId={1} canEdit isFirst isLast={false} onMove={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /one more night/i }));
    expect(update).toHaveBeenCalledWith({ nodeId: 5, body: { nights: 3 } });
  });

  it("delete calls the delete mutation", () => {
    render(<RouteNodeRow node={stay} routeId={1} canEdit isFirst isLast={false} onMove={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /remove amsterdam/i }));
    expect(del).toHaveBeenCalledWith(5);
  });

  it("hides edit controls when canEdit is false", () => {
    render(<RouteNodeRow node={stay} routeId={1} canEdit={false} isFirst isLast={false} onMove={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /one more night/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove amsterdam/i })).not.toBeInTheDocument();
  });
});
