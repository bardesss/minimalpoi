import { describe, expect, it } from "vitest";
import { sharePdfModel } from "./sharePdfModel";
import type { RouteDetail } from "../../types/api";

function route(over: Partial<RouteDetail> = {}): RouteDetail {
  return {
    id: 1, name: "Alps Trip", start_date: "2026-07-14", end_date: null,
    scheduled_end_date: "2026-07-15", round_trip: false,
    total_distance_m: 42000, total_duration_s: 3600, nodes: [], legs: [], attachments: [],
    ...over,
  } as unknown as RouteDetail;
}
const node = (o: Partial<RouteDetail["nodes"][number]>) =>
  ({ id: 0, kind: "stop", position: 0, nights: null, notes: null, poi_id: null,
     name: "", lat: 0, lng: 0, arrive_date: null, depart_date: null,
     inbound_distance_m: null, inbound_duration_s: null, role: null, ...o }) as RouteDetail["nodes"][number];

describe("sharePdfModel", () => {
  it("builds header stats and a date range", () => {
    const m = sharePdfModel(route({ nodes: [node({ id: 1, name: "A", day_offset: 0 })] }));
    expect(m.header.name).toBe("Alps Trip");
    expect(m.header.dateRange).toBe("2026-07-14 → 2026-07-15");
    expect(m.header.stats.distance).toBe("42 km");
  });

  it("numbers middle stops globally and attaches inbound legs with estimate flag", () => {
    const m = sharePdfModel(route({
      start_date: "2026-07-14",
      nodes: [
        node({ id: 1, name: "A", day_offset: 0 }),
        node({ id: 2, name: "B", day_offset: 0 }),
      ],
      legs: [{ from_node_id: 1, to_node_id: 2, distance_m: 12000, duration_s: 1800, source: "estimate", geometry: null }],
    }));
    const rows = m.days.flatMap((d) => d.rows);
    expect(rows.map((r) => r.seq)).toEqual([1, 2]);
    expect(rows[0].inboundLeg).toBeNull();
    expect(rows[1].inboundLeg).toEqual({ text: "12 km · 30 min", estimate: true });
  });

  it("emits a Starting point bookend and a round-trip Return end bookend", () => {
    const m = sharePdfModel(route({
      round_trip: true,
      nodes: [
        node({ id: 10, name: "Home", role: "start" }),
        node({ id: 1, name: "A", day_offset: 0 }),
        node({ id: 20, name: "Home", role: "end" }),
      ],
    }));
    expect(m.startBookend).toEqual({ label: "Starting point", name: "Home" });
    expect(m.endBookend).toEqual({ label: "Ending point", name: "Return to Home" });
    // role-bearing nodes never appear as itinerary rows
    expect(m.days.flatMap((d) => d.rows).map((r) => r.name)).toEqual(["A"]);
  });

  it("uses the plain end name for a one-way route and null when unset", () => {
    const oneWay = sharePdfModel(route({
      nodes: [node({ id: 1, name: "A", day_offset: 0 }), node({ id: 20, name: "Finish", role: "end" })],
    }));
    expect(oneWay.endBookend).toEqual({ label: "Ending point", name: "Finish" });
    const none = sharePdfModel(route({ nodes: [node({ id: 1, name: "A", day_offset: 0 })] }));
    expect(none.startBookend).toBeNull();
    expect(none.endBookend).toBeNull();
  });

  it("handles an empty route", () => {
    const m = sharePdfModel(route({ nodes: [] }));
    expect(m.days).toEqual([]);
    expect(m.startBookend).toBeNull();
  });
});
