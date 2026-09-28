import { describe, expect, it } from "vitest";
import { roundCoord } from "./geo";

describe("roundCoord", () => {
  it("rounds to 6 decimal places", () => {
    expect(roundCoord(52.357999999)).toBe(52.358);
    expect(roundCoord(-4.12345678)).toBe(-4.123457);
  });
});
