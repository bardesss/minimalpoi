import { describe, expect, it } from "vitest";
import { segmentDay } from "./shareRender";

describe("segmentDay", () => {
  it("reads the day index routeLine attaches to a segment/point feature", () => {
    expect(segmentDay({ day: 2 })).toBe(2);
  });

  it("defaults to day 0 when the property is missing (undated route)", () => {
    expect(segmentDay({})).toBe(0);
    expect(segmentDay(null)).toBe(0);
  });

  it("ignores a non-number day value", () => {
    expect(segmentDay({ day: "2" as unknown as number })).toBe(0);
  });
});
