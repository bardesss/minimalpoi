import { describe, expect, it } from "vitest";
import { appleMapsUrl, coordsText, dayWaypoints, googleMapsDirUrl, toGpx, type Waypoint } from "./routeNav";
import type { DayGroup } from "./routeDays";
import type { RouteNode } from "../types/api";

function node(id: number, name: string, lat: number, lng: number): RouteNode {
  return { id, kind: "stop", position: id, nights: null, notes: null, poi_id: null, name, lat, lng, arrive_date: null, depart_date: null, inbound_distance_m: null, inbound_duration_s: null };
}
const groups: DayGroup[] = [
  { dayKey: "2026-07-14", driving_distance_m: 0, driving_duration_s: 0, nodes: [node(1, "Home", 52.0, 4.0)] },
  { dayKey: "2026-07-15", driving_distance_m: 0, driving_duration_s: 0, nodes: [node(2, "Mid", 53.0, 5.0), node(3, "Bed", 54.0, 6.0)] },
];

describe("dayWaypoints", () => {
  it("day 0 is just its own stops", () => {
    expect(dayWaypoints(groups, 0).map((w) => w.name)).toEqual(["Home"]);
  });
  it("later days start from the previous day's last node (where you slept)", () => {
    expect(dayWaypoints(groups, 1).map((w) => w.name)).toEqual(["Home", "Mid", "Bed"]);
  });
});

describe("googleMapsDirUrl", () => {
  it("puts first as origin, last as destination, middle as waypoints", () => {
    const pts: Waypoint[] = [
      { name: "o", lat: 52, lng: 4 }, { name: "m", lat: 53, lng: 5 }, { name: "d", lat: 54, lng: 6 },
    ];
    const url = googleMapsDirUrl(pts);
    expect(url).toContain("origin=52%2C4");
    expect(url).toContain("destination=54%2C6");
    expect(url).toContain("waypoints=53%2C5");
    expect(url).toContain("travelmode=driving");
  });
  it("omits waypoints for a two-point day", () => {
    expect(googleMapsDirUrl([{ name: "o", lat: 1, lng: 2 }, { name: "d", lat: 3, lng: 4 }])).not.toContain("waypoints=");
  });
});

describe("appleMapsUrl", () => {
  it("uses saddr/daddr endpoints (single via-stop limit)", () => {
    const url = appleMapsUrl([{ name: "o", lat: 1, lng: 2 }, { name: "x", lat: 5, lng: 6 }, { name: "d", lat: 3, lng: 4 }]);
    expect(url).toContain("saddr=1%2C2");
    expect(url).toContain("daddr=3%2C4");
  });
});

describe("toGpx", () => {
  it("emits a route with one rtept per stop and escapes names", () => {
    const gpx = toGpx([{ name: "A & B", lat: 1.5, lng: 2.5 }], "Day 1");
    expect(gpx).toContain('<rtept lat="1.5" lon="2.5">');
    expect(gpx).toContain("<name>A &amp; B</name>");
    expect(gpx).toContain("<rte><name>Day 1</name>");
  });
});

describe("coordsText", () => {
  it("numbers each stop with its coordinates", () => {
    expect(coordsText([{ name: "A", lat: 1, lng: 2 }, { name: "B", lat: 3, lng: 4 }])).toBe("1. A\n1,2\n2. B\n3,4");
  });
});
