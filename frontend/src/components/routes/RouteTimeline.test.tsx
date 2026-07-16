import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RouteTimeline, { computeMovePosition, computeDropPosition } from "./RouteTimeline";
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
  useSearchPlaces: () => ({ mutateAsync: vi.fn() }),
  usePlaceDraft: () => ({ mutateAsync: vi.fn() }),
  useCreatePoi: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("../../lib/dayState", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/dayState")>();
  return { ...actual, todayIso: () => "2026-07-01" };
});

beforeEach(() => {
  add.mockClear();
  update.mockClear();
});

function node(id: number, kind: "stay" | "stop", position: number): RouteNode {
  return { id, kind, position, nights: kind === "stay" ? 1 : null, notes: null, poi_id: null, name: `N${id}`, lat: 0, lng: 0, arrive_date: null, depart_date: null, inbound_distance_m: null, inbound_duration_s: null };
}

const route: RouteDetail = {
  id: 1, name: "NL", start_date: "2026-07-14", end_date: "2026-07-16", scheduled_end_date: "2026-07-16", node_count: 2, created_by: 1, owner_username: "admin",
  team_id: null, team_name: null, can_edit: true,
  nodes: [node(1, "stay", 1), node(2, "stay", 2)],
  legs: [{ from_node_id: 1, to_node_id: 2, distance_m: 28000, duration_s: 2100, source: "estimate", geometry: null }],
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

describe("computeDropPosition", () => {
  const nodes = [node(1, "stay", 1), node(2, "stay", 2), node(3, "stay", 3)];

  it("returns null for a no-op drop", () => {
    expect(computeDropPosition(nodes, 1, 1)).toBeNull();
  });

  it("drops a node to the top (before the first)", () => {
    expect(computeDropPosition(nodes, 2, 0)).toBe(0); // pos1 - 1
  });

  it("drops a node to the bottom (after the last)", () => {
    expect(computeDropPosition(nodes, 0, 2)).toBe(4); // pos3 + 1
  });

  it("drops a node into the middle between its new neighbours", () => {
    // move node at index 0 to index 1: it lands between old node2 (2) and node3 (3)
    expect(computeDropPosition(nodes, 0, 1)).toBe(2.5); // (2 + 3)/2
  });
});

describe("RouteTimeline", () => {
  it("renders nodes and the leg between them", () => {
    render(<RouteTimeline route={route} canEdit />);
    expect(screen.getByText("N1")).toBeInTheDocument();
    expect(screen.getByText("N2")).toBeInTheDocument();
    // The single-day fixture has just one leg, so the day header's driving
    // total and the leg row's own text are identical strings — both appear.
    expect(screen.getAllByText("28 km · 35 min")).toHaveLength(2);
  });

  it("add-stop picks a place and calls the add mutation", () => {
    render(<RouteTimeline route={route} canEdit />);
    // Exact name ("+ Add stop") targets the bottom control; per-day "+ Add stop"
    // buttons carry a day-specific aria-label ("Add stop to ...") instead.
    fireEvent.click(screen.getByRole("button", { name: "+ Add stop" }));
    fireEvent.click(screen.getByRole("button", { name: "Utrecht" }));
    expect(add).toHaveBeenCalledWith({ kind: "stop", poi_id: 7, nights: null });
  });

  it("hides add controls in read-only mode", () => {
    render(<RouteTimeline route={route} canEdit={false} />);
    expect(screen.queryByRole("button", { name: /add stop/i })).not.toBeInTheDocument();
  });
});

describe("RouteTimeline day grouping", () => {
  const twoDay: RouteDetail = {
    ...route,
    start_date: "2026-07-14",
    nodes: [
      { ...node(1, "stay", 1), name: "Aalborg", arrive_date: "2026-07-14", depart_date: "2026-07-15", nights: 1 },
      { ...node(2, "stay", 2), name: "Skottevik", arrive_date: "2026-07-15", depart_date: "2026-07-16", nights: 1 },
    ],
    legs: [{ from_node_id: 1, to_node_id: 2, distance_m: 232000, duration_s: 16080, source: "estimate", geometry: null }],
  };

  it("renders a day header per active day with the date label", () => {
    render(<RouteTimeline route={twoDay} canEdit />);
    expect(screen.getByText("TUE 14 JUL")).toBeInTheDocument(); // 2026-07-14 is a Tuesday
    expect(screen.getByText("WED 15 JUL")).toBeInTheDocument(); // 2026-07-15 is a Wednesday
  });

  it("shows the day's driving total on days that involve travel", () => {
    render(<RouteTimeline route={twoDay} canEdit />);
    // Day 2 has exactly one inbound leg, so the day header's total and the leg
    // row above Skottevik render the same text — assert it appears at all.
    expect(screen.getAllByText("232 km · 4 h 28 min")).toHaveLength(2);
  });
});

describe("RouteTimeline collapse", () => {
  const pastFuture: RouteDetail = {
    ...route,
    start_date: "2026-06-20",
    nodes: [
      { ...node(1, "stay", 1), name: "PastTown", arrive_date: "2026-06-20", depart_date: "2026-06-21", nights: 1 },
      { ...node(2, "stay", 2), name: "FutureTown", arrive_date: "2026-07-14", depart_date: "2026-07-15", nights: 1 },
    ],
    legs: [{ from_node_id: 1, to_node_id: 2, distance_m: 100000, duration_s: 6000, source: "estimate", geometry: null }],
  };

  it("collapses past days and expands future days by default", () => {
    render(<RouteTimeline route={pastFuture} canEdit={false} />);
    expect(screen.queryByText("PastTown")).not.toBeInTheDocument(); // 2026-06-20 < today → collapsed
    expect(screen.getByText("FutureTown")).toBeInTheDocument();     // 2026-07-14 ≥ today → expanded
  });

  it("expands a collapsed past day when its header is clicked", async () => {
    render(<RouteTimeline route={pastFuture} canEdit={false} />);
    // Only a collapsed day shows the "· N stops" suffix, so this name is unique.
    await userEvent.click(screen.getByRole("button", { name: /1 stops/ }));
    expect(screen.getByText("PastTown")).toBeInTheDocument();
  });
});

describe("RouteTimeline per-day add", () => {
  const multiNight: RouteDetail = {
    ...route,
    start_date: "2026-07-14",
    nodes: [
      { ...node(1, "stay", 1), name: "Hotel X", arrive_date: "2026-07-14", depart_date: "2026-07-16", nights: 2 },
    ],
    legs: [],
  };

  it("adds a stop to the middle day with that day's offset and an in-day position", async () => {
    render(<RouteTimeline route={multiNight} canEdit />);
    // Three day sections: 14 (Hotel X), 15 (empty middle = WED 15 JUL), 16 (empty departure).
    // Each day's own "+ Add stop" has a day-specific accessible name; the bottom
    // controls' "+ Add stop" is just "Add stop", so this query is unambiguous.
    await userEvent.click(screen.getByRole("button", { name: /add stop to wed 15 jul/i }));
    await userEvent.click(screen.getByRole("button", { name: "Utrecht" })); // mocked saved POI
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ kind: "stop", poi_id: 7, day_offset: 1 }));
    expect(add.mock.calls[0][0].position).toBeGreaterThan(1); // positioned after Hotel X (pos 1)
  });
});

describe("RouteTimeline navigate", () => {
  const twoDay: RouteDetail = {
    ...route,
    nodes: [
      { ...node(1, "stay", 1), name: "Aalborg", arrive_date: "2026-07-14", depart_date: "2026-07-15", nights: 1 },
      { ...node(2, "stay", 2), name: "Skottevik", arrive_date: "2026-07-15", depart_date: "2026-07-16", nights: 1 },
    ],
    legs: [{ from_node_id: 1, to_node_id: 2, distance_m: 232000, duration_s: 16080, source: "estimate", geometry: null }],
  };

  it("uses the OS share sheet with a Google Maps URL when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share });
    try {
      render(<RouteTimeline route={twoDay} canEdit={false} />);
      await userEvent.click(screen.getAllByRole("button", { name: /navigate/i })[0]);
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringContaining("google.com/maps/dir/") }),
      );
    } finally {
      delete (navigator as unknown as { share?: unknown }).share;
    }
  });
});
