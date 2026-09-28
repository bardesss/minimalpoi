import { describe, expect, it } from "vitest";
import { formatDayLabel } from "./formatDayLabel";

describe("formatDayLabel", () => {
  it("formats an ISO date as UPPERCASE weekday day month (en-GB)", () => {
    expect(formatDayLabel("2026-07-16", "en-GB")).toBe("THU 16 JUL"); // 2026-07-16 is a Thursday
  });

  it("has no leading zero on single-digit days", () => {
    expect(formatDayLabel("2026-03-01", "en-GB")).toBe("SUN 1 MAR"); // 2026-03-01 is a Sunday
  });

  it("parses from date parts so it does not shift under timezone", () => {
    // Constructed from y/m/d parts, not Date(iso) UTC-midnight — the day never moves.
    expect(formatDayLabel("2026-01-01", "en-GB")).toBe("THU 1 JAN");
  });

  it("follows the user's language: nl-NL", () => {
    expect(formatDayLabel("2026-07-16", "nl-NL")).toBe("DO 16 JUL");
  });

  it("follows the user's language: de-DE (strips the weekday's trailing dot)", () => {
    // Confirmed against a real Node run: de-DE has no distinct short form for
    // "juli" (it's the same as the full month name), unlike the other months.
    expect(formatDayLabel("2026-07-16", "de-DE")).toBe("DO 16 JULI");
  });

  it("falls back to the runtime default locale for a malformed tag instead of throwing", () => {
    expect(() => formatDayLabel("2026-07-16", "en_US@x")).not.toThrow();
    // (Passing `undefined` explicitly would pick navigator.language via the
    // default parameter, so compare against the runtime's own default locale.)
    const runtimeDefault = new Intl.DateTimeFormat().resolvedOptions().locale;
    expect(formatDayLabel("2026-07-16", "en_US@x")).toBe(formatDayLabel("2026-07-16", runtimeDefault));
  });
});
