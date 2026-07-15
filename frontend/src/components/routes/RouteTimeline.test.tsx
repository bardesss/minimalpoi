import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RouteTimeline, { computeMovePosition } from "./RouteTimeline";
import type { RouteDetail, RouteNode } from "../../types/api";

const add = vi.fn();
const update = vi.fn();
vi.mock("../../queries/hooks", () => ({
  useAddNode: () => ({ mutate: add, isPending: false }),
  useUpdateNode: () => ({ mutate: update, isPending: false }),
  useDeleteNode: () => ({ mutate: vi.fn(), isPending: false }),
  usePois: () => ({ data: [{ id: 7, name: "Utrecht", lat: 52.09, lng: 5.12 }] }),
  useUploadRouteAttachment: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteRouteAttachment: () => ({ mutate: vi.fn(), isPending: false }),
}));

beforeEach(() => {
  add.mockClear();
  update.mockClear();
});

function node(id: number, kind: "stay" | "stop", position: number): RouteNode {
  return { id, kind, position, nights: kind === "stay" ? 1 : null, notes: null, poi_id: null, name: `N${id}`, lat: 0, lng: 0, arrive_date: null, depart_date: null, inbound_distance_m: null, inbound_duration_s: null };
}

const route: RouteDetail = {
  id: 1, name: "NL", start_date: "2026-07-14", end_date: "2026-07-16", node_count: 2, created_by: 1, owner_username: "admin",
  nodes: [node(1, "stay", 1), node(2, "stay", 2)],
  legs: [{ from_node_id: 1, to_node_id: 2, distance_m: 28000, duration_s: 2100, source: "estimate" }],
  attachments: [],
  total_distance_m: 28000, total_duration_s: 2100,
};

describe("computeMovePosition", () => {
  const nodes = [node(1, "stay", 1), node(2, "stay", 2), node(3, "stay", 3)];
  it("moves the middle node up between its new neighbours", () => {
    expect(computeMovePosition(nodes, 1, -1)).toBe(0); // before index 0 → pos0 - 1
  });
  it("moves a node down past the end", () => {
    expect(computeMovePosition(nodes, 2, 1)).toBeNull(); // already last
    expect(computeMovePosition(nodes, 1, 1)).toBe(4); // past last → pos3 + 1
  });
});

describe("RouteTimeline", () => {
  it("renders nodes and the leg between them", () => {
    render(<RouteTimeline route={route} canEdit />);
    expect(screen.getByText("N1")).toBeInTheDocument();
    expect(screen.getByText("N2")).toBeInTheDocument();
    expect(screen.getByText("28 km · 35 min")).toBeInTheDocument();
  });

  it("add-stop picks a place and calls the add mutation", () => {
    render(<RouteTimeline route={route} canEdit />);
    fireEvent.click(screen.getByRole("button", { name: /add stop/i }));
    fireEvent.click(screen.getByRole("button", { name: "Utrecht" }));
    expect(add).toHaveBeenCalledWith({ kind: "stop", poi_id: 7, nights: null });
  });

  it("hides add controls in read-only mode", () => {
    render(<RouteTimeline route={route} canEdit={false} />);
    expect(screen.queryByRole("button", { name: /add stop/i })).not.toBeInTheDocument();
  });
});
