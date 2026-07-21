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

beforeEach(() => { update.mockClear(); del.mockClear(); });

const stay: RouteNode = {
  id: 5, kind: "stay", position: 1, nights: 2, notes: null, poi_id: null,
  name: "Amsterdam", lat: 52.3, lng: 4.9,
  arrive_date: "2026-07-14", depart_date: "2026-07-16",
  inbound_distance_m: 0, inbound_duration_s: 0, role: null,
};

describe("RouteNodeRow", () => {
  it("shows a stay with its date range and nights", () => {
    render(<RouteNodeRow node={stay} routeId={1} canEdit />);
    expect(screen.getByText("Amsterdam")).toBeInTheDocument();
    expect(screen.getByText("2026-07-14 → 2026-07-16")).toBeInTheDocument();
    expect(screen.getByText(/2 nights/)).toBeInTheDocument();
  });

  it("has no up/down arrows", () => {
    render(<RouteNodeRow node={stay} routeId={1} canEdit />);
    expect(screen.queryByRole("button", { name: /move up/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /move down/i })).not.toBeInTheDocument();
  });

  it("exposes a drag handle when editable and not pinned", () => {
    render(<RouteNodeRow node={stay} routeId={1} canEdit />);
    expect(screen.getByRole("button", { name: /reorder amsterdam/i })).toBeInTheDocument();
  });

  it("omits the drag handle when pinned", () => {
    render(<RouteNodeRow node={stay} routeId={1} canEdit pinned />);
    expect(screen.queryByRole("button", { name: /reorder amsterdam/i })).not.toBeInTheDocument();
  });

  it("nights stepper and delete still fire", () => {
    render(<RouteNodeRow node={stay} routeId={1} canEdit />);
    fireEvent.click(screen.getByRole("button", { name: /one more night/i }));
    expect(update).toHaveBeenCalledWith({ nodeId: 5, body: { nights: 3 } });
    fireEvent.click(screen.getByRole("button", { name: /remove amsterdam/i }));
    expect(del).toHaveBeenCalledWith(5);
  });
});

describe("saved-POI badge", () => {
  it("shows a Saved place badge when the node is a saved POI", () => {
    render(<RouteNodeRow node={{ ...stay, poi_id: 42 }} routeId={1} canEdit />);
    expect(screen.getByLabelText("Saved place")).toBeInTheDocument();
  });
  it("shows no badge for an ad-hoc point", () => {
    render(<RouteNodeRow node={{ ...stay, poi_id: null }} routeId={1} canEdit />);
    expect(screen.queryByLabelText("Saved place")).not.toBeInTheDocument();
  });
});

describe("order number in the circle", () => {
  it("shows the seq number for a middle node", () => {
    render(<RouteNodeRow node={{ ...stay, role: null }} routeId={1} canEdit seq={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });
  it("shows a start glyph for a start node regardless of seq", () => {
    render(<RouteNodeRow node={{ ...stay, kind: "stop", role: "start" }} routeId={1} canEdit pinned />);
    expect(screen.getByText("▶")).toBeInTheDocument();
  });
});

describe("hover highlight", () => {
  it("fires onHover with the id on enter and null on leave", () => {
    const onHover = vi.fn();
    render(<RouteNodeRow node={stay} routeId={1} canEdit onHover={onHover} />);
    const row = screen.getByText("Amsterdam").closest("div")!.parentElement!;
    fireEvent.mouseEnter(row);
    expect(onHover).toHaveBeenCalledWith(5);
    fireEvent.mouseLeave(row);
    expect(onHover).toHaveBeenCalledWith(null);
  });
});
