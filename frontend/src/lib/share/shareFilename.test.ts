import { describe, expect, it } from "vitest";
import { shareFilename } from "./shareFilename";

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
});
