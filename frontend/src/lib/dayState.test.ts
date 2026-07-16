import { describe, expect, it } from "vitest";
import { isDayPassed, passedNodeIds, todayIso } from "./dayState";
import type { RouteDetail, RouteNode } from "../types/api";

function stay(id: number, position: number, name: string, arrive: string, depart: string): RouteNode {
  return { id, kind: "stay", position, nights: 1, notes: null, poi_id: null, name, lat: 0, lng: 0, arrive_date: arrive, depart_date: depart, inbound_distance_m: null, inbound_duration_s: null };
}
function stop(id: number, position: number, name: string): RouteNode {
  return { id, kind: "stop", position, nights: null, notes: null, poi_id: null, name, lat: 0, lng: 0, arrive_date: null, depart_date: null, inbound_distance_m: null, inbound_duration_s: null };
}
const route: RouteDetail = {
  id: 1, name: "T", start_date: "2026-07-14", end_date: null, scheduled_end_date: "2026-07-17",
  node_count: 4, created_by: 1, owner_username: "a", team_id: null, team_name: null, can_edit: true,
  nodes: [
    stay(1, 1, "A", "2026-07-14", "2026-07-15"),
    stay(2, 2, "B", "2026-07-15", "2026-07-16"),
    stop(3, 3, "C"),
    stay(4, 4, "D", "2026-07-16", "2026-07-17"),
  ],
  legs: [], attachments: [], total_distance_m: 0, total_duration_s: 0,
} as RouteDetail;

describe("isDayPassed", () => {
  it("is true strictly before today", () => expect(isDayPassed("2026-07-15", "2026-07-16")).toBe(true));
  it("is false on today", () => expect(isDayPassed("2026-07-16", "2026-07-16")).toBe(false));
  it("is false in the future", () => expect(isDayPassed("2026-07-17", "2026-07-16")).toBe(false));
});

describe("todayIso", () => {
  it("returns a local YYYY-MM-DD string", () => expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/));
});

describe("passedNodeIds", () => {
  it("collects node ids from days strictly before today", () => {
    // today = 2026-07-16 → days 07-14 (A) and 07-15 (B) are passed; C+D are on 07-16.
    const ids = passedNodeIds(route, "2026-07-16");
    expect([...ids].sort((x, y) => x - y)).toEqual([1, 2]);
  });
  it("returns an empty set for an all-future trip", () => {
    expect(passedNodeIds(route, "2000-01-01").size).toBe(0);
  });
});
