import { describe, expect, it } from "vitest";
import { shareStats } from "./shareStats";
import type { RouteDetail } from "../../types/api";

const route = {
  start_date: "2026-07-14", end_date: null, scheduled_end_date: "2026-07-16",
  total_distance_m: 254000, total_duration_s: 0,
  nodes: [
    { id: 1, role: "start" }, { id: 2, role: null }, { id: 3, role: null }, { id: 4, role: "end" },
  ],
} as unknown as RouteDetail;

describe("shareStats", () => {
  it("summarises distance, days and middle-stop count", () => {
    expect(shareStats(route)).toEqual({ distance: "254 km", days: "3 days", stops: "2 stops" });
  });
  it("says '1 day' / '1 stop' in the singular", () => {
    const r = { ...route, scheduled_end_date: "2026-07-14", nodes: [{ id: 1, role: null }] } as unknown as RouteDetail;
    expect(shareStats(r)).toMatchObject({ days: "1 day", stops: "1 stop" });
  });
});
