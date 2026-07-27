import { describe, expect, it, vi } from "vitest";
import type { MapSettings, RouteDetail } from "../../types/api";

// A 1x1 transparent PNG (RGBA) so jsPDF.addImage has real bytes to embed.
// Decoded via atob (not fetch("data:...")): the test setup's MSW server runs
// with onUnhandledRequest: "error" and its network interceptor mis-parses
// data: URLs (misreads them as "GET nullimage/png;base64,..."), throwing
// before renderSharePdf ever runs. Building the Blob directly from the
// base64 bytes avoids the network layer entirely.
const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=";
function pngBlob(): Blob {
  const binary = atob(PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: "image/png" });
}

vi.mock("./shareRender", () => ({
  renderShareImage: vi.fn(async () => pngBlob()),
}));

import { renderSharePdf, toWinAnsi } from "./sharePdf";

const settings = { default_map_center_lat: 0, default_map_center_lng: 0, default_map_zoom: 5 } as unknown as MapSettings;
const route = {
  id: 1, name: "Trip", start_date: "2026-07-14", end_date: null, scheduled_end_date: "2026-07-15",
  round_trip: false, total_distance_m: 1000, total_duration_s: 60,
  nodes: [{ id: 1, role: null, kind: "stop", name: "A", notes: "bring boots", day_offset: 0 }],
  legs: [], attachments: [],
} as unknown as RouteDetail;

describe("renderSharePdf", () => {
  it("returns an application/pdf blob", async () => {
    const blob = await renderSharePdf({ route, settings, variant: "map" });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe("toWinAnsi", () => {
  it("replaces non-WinAnsi arrow glyphs with WinAnsi-safe equivalents", () => {
    expect(toWinAnsi("2026-07-14 → 2026-07-15")).toBe("2026-07-14 – 2026-07-15");
    expect(toWinAnsi("↓  1.2 km")).toBe("•  1.2 km");
  });

  it("passes plain Latin text and already-WinAnsi punctuation through unchanged", () => {
    expect(toWinAnsi("12.4 km   ·   3 days   ·   5 stops")).toBe("12.4 km   ·   3 days   ·   5 stops");
    expect(toWinAnsi("Day 1    —    45 min")).toBe("Day 1    —    45 min");
  });
});
