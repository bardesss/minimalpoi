import { describe, expect, it } from "vitest";
import { shareFilename, sharePdfFilename } from "./shareFilename";

describe("shareFilename", () => {
  it("builds a safe png name", () => {
    expect(shareFilename("Dutch Coast", "square", "map")).toBe("Dutch Coast - square - map.png");
  });
  it("strips path-unsafe characters and collapses whitespace", () => {
    expect(shareFilename("  A/B:C\\D  ", "story", "transparent")).toBe("A-B-C-D - story - transparent.png");
  });
  it("falls back to 'route' when the name is empty", () => {
    expect(shareFilename("   ", "landscape", "map")).toBe("route - landscape - map.png");
  });
  it("collapses internal whitespace", () => {
    expect(shareFilename("A   B\tC", "square", "map")).toBe("A B C - square - map.png");
  });
});

describe("sharePdfFilename", () => {
  it("slugifies the route name and ends in .pdf", () => {
    expect(sharePdfFilename("Alps: Trip/2026")).toBe("Alps- Trip-2026 - itinerary.pdf");
  });
  it("falls back to 'route' when the name is blank", () => {
    expect(sharePdfFilename("   ")).toBe("route - itinerary.pdf");
  });
});
