import { describe, expect, it } from "vitest";
import { formatTravel } from "./formatTravel";

describe("formatTravel", () => {
  it("formats km and minutes", () => {
    expect(formatTravel(28000, 2100)).toBe("28 km · 35 min");
  });
  it("uses hours over 60 min", () => {
    expect(formatTravel(150000, 7200)).toBe("150 km · 2 h 0 min");
  });
  it("handles zero", () => {
    expect(formatTravel(0, 0)).toBe("0 km · 0 min");
  });
});
