import { describe, expect, it } from "vitest";
import { SHARE_FORMATS } from "./shareFormats";
import { shareLayout } from "./shareLayout";

describe("shareLayout", () => {
  it("keeps every element inside the canvas for all formats", () => {
    for (const spec of SHARE_FORMATS) {
      const L = shareLayout(spec);
      expect(L.width).toBe(spec.width);
      expect(L.height).toBe(spec.height);
      // logo and stats sit within bounds
      expect(L.logo.x).toBeGreaterThanOrEqual(0);
      expect(L.logo.y + L.logo.size).toBeLessThanOrEqual(spec.height);
      expect(L.stats.y).toBeLessThanOrEqual(spec.height);
      expect(L.title.x + L.title.maxWidth).toBeLessThanOrEqual(spec.width);
    }
  });
});
