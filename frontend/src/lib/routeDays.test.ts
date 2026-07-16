import { describe, expect, it } from "vitest";
import { addDays, daysBetween, groupNodesByDay } from "./routeDays";
import type { RouteDetail, RouteLeg, RouteNode } from "../types/api";

function stay(id: number, position: number, name: string, arrive: string, depart: string, nights: number): RouteNode {
  return { id, kind: "stay", position, nights, notes: null, poi_id: null, name, lat: 0, lng: 0, arrive_date: arrive, depart_date: depart, inbound_distance_m: null, inbound_duration_s: null, day_offset: null };
}
function stop(id: number, position: number, name: string): RouteNode {
  return { id, kind: "stop", position, nights: null, notes: null, poi_id: null, name, lat: 0, lng: 0, arrive_date: null, depart_date: null, inbound_distance_m: null, inbound_duration_s: null, day_offset: null };
}
function leg(from: number, to: number, distance_m: number, duration_s: number): RouteLeg {
  return { from_node_id: from, to_node_id: to, distance_m, duration_s, source: "estimate", geometry: null };
}

// Aalborg(14→15) · Skottevik(15→16) · Fennefossen,Reiårsfossen(stops,16) · Silver(16→17) · Låtefossen,Bondhus(stops,17)
const route: RouteDetail = {
  id: 1, name: "NL", start_date: "2026-07-14", end_date: null, scheduled_end_date: "2026-07-17",
  node_count: 7, created_by: 1, owner_username: "admin", team_id: null, team_name: null, can_edit: true,
  nodes: [
    stay(1, 1, "Aalborg", "2026-07-14", "2026-07-15", 1),
    stay(2, 2, "Skottevik", "2026-07-15", "2026-07-16", 1),
    stop(3, 3, "Fennefossen"),
    stop(4, 4, "Reiårsfossen"),
    stay(5, 5, "Silver Garden", "2026-07-16", "2026-07-17", 1),
    stop(6, 6, "Låtefossen"),
    stop(7, 7, "Bondhusvatnet"),
  ],
  legs: [
    leg(1, 2, 232000, 16080),  // Aalborg → Skottevik  (counts to day 15)
    leg(2, 3, 84000, 5040),    // Skottevik → Fennefossen (day 16)
    leg(3, 4, 56000, 3120),    // Fennefossen → Reiårsfossen (day 16)
    leg(4, 5, 27000, 1560),    // Reiårsfossen → Silver (day 16)
    leg(5, 6, 179000, 9600),   // Silver → Låtefossen (day 17)
    leg(6, 7, 35000, 2400),    // Låtefossen → Bondhus (day 17)
  ],
  attachments: [], total_distance_m: 613000, total_duration_s: 37800,
};

describe("groupNodesByDay", () => {
  it("splits the itinerary into one group per active calendar day", () => {
    const groups = groupNodesByDay(route);
    expect(groups.map((g) => g.dayKey)).toEqual(["2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17"]);
  });

  it("assigns stops to the day they are travelled (previous stay's departure)", () => {
    const groups = groupNodesByDay(route);
    const day16 = groups.find((g) => g.dayKey === "2026-07-16")!;
    expect(day16.nodes.map((n) => n.name)).toEqual(["Fennefossen", "Reiårsfossen", "Silver Garden"]);
  });

  it("sums each day's driving from the inbound legs of its nodes", () => {
    const groups = groupNodesByDay(route);
    const byDay = Object.fromEntries(groups.map((g) => [g.dayKey, g]));
    expect(byDay["2026-07-14"].driving_distance_m).toBe(0);          // first node, no inbound leg
    expect(byDay["2026-07-15"].driving_distance_m).toBe(232000);
    expect(byDay["2026-07-16"].driving_distance_m).toBe(167000);     // 84 + 56 + 27
    expect(byDay["2026-07-16"].driving_duration_s).toBe(9720);       // 5040 + 3120 + 1560
    expect(byDay["2026-07-17"].driving_distance_m).toBe(214000);     // 179 + 35
  });

  it("returns an empty array for a route with no nodes", () => {
    expect(groupNodesByDay({ ...route, nodes: [], legs: [] })).toEqual([]);
  });
});

describe("addDays / daysBetween", () => {
  it("adds days without timezone shift", () => {
    expect(addDays("2026-07-14", 2)).toBe("2026-07-16");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("counts whole days between ISO dates", () => {
    expect(daysBetween("2026-07-14", "2026-07-16")).toBe(2);
    expect(daysBetween("2026-07-16", "2026-07-16")).toBe(0);
  });
});

describe("groupNodesByDay multi-night", () => {
  // Hotel X: 2 nights (14→16). Stops on offset 0 (arrival), 1 (middle), null (departure).
  const multi: RouteDetail = {
    id: 2, name: "M", start_date: "2026-07-14", end_date: null, scheduled_end_date: "2026-07-16",
    node_count: 4, created_by: 1, owner_username: "a", team_id: null, team_name: null, can_edit: true,
    nodes: [
      { ...stay(1, 1, "Hotel X", "2026-07-14", "2026-07-16", 2) },
      { ...stop(2, 2, "Arrival stop"), day_offset: 0 },
      { ...stop(3, 3, "Middle stop"), day_offset: 1 },
      { ...stop(4, 4, "Depart stop"), day_offset: null },
    ],
    legs: [], attachments: [], total_distance_m: 0, total_duration_s: 0,
  } as RouteDetail;

  it("emits one group per calendar day of the stay's span", () => {
    expect(groupNodesByDay(multi).map((g) => g.dayKey)).toEqual(["2026-07-14", "2026-07-15", "2026-07-16"]);
  });

  it("places stops on the day named by their offset (null = departure day)", () => {
    const byDay = Object.fromEntries(groupNodesByDay(multi).map((g) => [g.dayKey, g.nodes.map((n) => n.name)]));
    expect(byDay["2026-07-14"]).toEqual(["Hotel X", "Arrival stop"]);
    expect(byDay["2026-07-15"]).toEqual(["Middle stop"]);
    expect(byDay["2026-07-16"]).toEqual(["Depart stop"]);
  });

  it("keeps an empty middle day when nothing is scheduled there", () => {
    const noMiddle = { ...multi, nodes: [multi.nodes[0]] } as RouteDetail; // just the 2-night stay
    const groups = groupNodesByDay(noMiddle);
    expect(groups.map((g) => g.dayKey)).toEqual(["2026-07-14", "2026-07-15", "2026-07-16"]);
    expect(groups[1].nodes).toEqual([]); // middle day exists but is empty
  });

  it("clamps an over-range offset to the departure day", () => {
    const over = { ...multi, nodes: [multi.nodes[0], { ...stop(9, 9, "Far"), day_offset: 5 }] } as RouteDetail;
    const byDay = Object.fromEntries(groupNodesByDay(over).map((g) => [g.dayKey, g.nodes.map((n) => n.name)]));
    expect(byDay["2026-07-16"]).toContain("Far"); // clamp(5, 0, 2) = 2 → departure day
  });
});
