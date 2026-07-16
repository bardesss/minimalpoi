import { describe, expect, it } from "vitest";
import { formatDayLabel } from "./formatDayLabel";

describe("formatDayLabel", () => {
  it("formats an ISO date as UPPERCASE weekday day month", () => {
    expect(formatDayLabel("2026-07-16")).toBe("THU 16 JUL"); // 2026-07-16 is a Thursday
  });

  it("has no leading zero on single-digit days", () => {
    expect(formatDayLabel("2026-03-01")).toBe("SUN 1 MAR"); // 2026-03-01 is a Sunday
  });

  it("parses from date parts so it does not shift under timezone", () => {
    // Constructed from y/m/d parts, not Date(iso) UTC-midnight — the day never moves.
    expect(formatDayLabel("2026-01-01")).toBe("THU 1 JAN");
  });
});
