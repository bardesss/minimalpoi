import { describe, expect, it } from "vitest";
import type { MapSettings, Settings } from "./api";

// Compile-time guard: a Settings must be usable everywhere a MapSettings is, so
// the five shared map fields can't drift apart. This assignment only type-checks
// — it fails the build (tsc -b) rather than the test run.
const _mapFromSettings: (s: Settings) => MapSettings = (s) => s;

describe("Settings/MapSettings", () => {
  it("shares the map fields (runtime smoke)", () => {
    const s = { map_tile_url: "x", default_map_center_lat: 0, default_map_center_lng: 0, default_map_zoom: 1, routes_enabled: true } as Settings;
    const m: MapSettings = _mapFromSettings(s);
    expect(m.map_tile_url).toBe("x");
  });
});
