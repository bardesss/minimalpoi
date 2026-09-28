import { describe, expect, it } from "vitest";
import { formatDate, formatDateRange } from "./formatDate";

// ICU may put thin/no-break spaces around the range dash (and this Node
// build's ICU inserts a comma after the weekday); normalise loosely rather
// than pin an exact byte sequence.
const THIN_SPACE = String.fromCharCode(0x2009);
const NBSP = String.fromCharCode(0x00a0);
const NARROW_NBSP = String.fromCharCode(0x202f);
const norm = (s: string) =>
  s.split(THIN_SPACE).join(" ").split(NBSP).join(" ").split(NARROW_NBSP).join(" ").replace(/\s+/g, " ");

describe("formatDate", () => {
  it("formats an ISO day without shifting it (no UTC parse)", () => {
    expect(norm(formatDate("2026-10-09", "en-GB"))).toMatch(/^Fri,? 9 Oct 2026$/);
    expect(norm(formatDate("2026-01-01", "en-GB"))).toMatch(/^Thu,? 1 Jan 2026$/);
  });
});

describe("formatDateRange", () => {
  it("collapses a shared month and year", () => {
    expect(norm(formatDateRange("2026-10-09", "2026-10-11", "en-GB"))).toMatch(/^Fri,? 9( Oct)? . Sun,? 11 Oct 2026$/);
  });
  it("keeps both months when they differ", () => {
    expect(norm(formatDateRange("2026-10-30", "2026-11-02", "en-GB"))).toMatch(/^Fri,? 30 Oct . Mon,? 2 Nov 2026$/);
  });
  it("keeps both years across a new year", () => {
    expect(norm(formatDateRange("2026-12-30", "2027-01-01", "en-GB"))).toMatch(/^Wed,? 30 Dec 2026 . Fri,? 1 Jan 2027$/);
  });
  it("shows a single day when start and end match", () => {
    expect(norm(formatDateRange("2026-10-09", "2026-10-09", "en-GB"))).toMatch(/^Fri,? 9 Oct 2026$/);
  });
  it("marks an open-ended range", () => {
    expect(norm(formatDateRange("2026-10-09", null, "en-GB"))).toMatch(/^From Fri,? 9 Oct 2026$/);
  });
  it("follows the locale", () => {
    expect(norm(formatDateRange("2026-10-09", "2026-10-11", "nl-NL"))).toMatch(/vr,? 9\s*.\s*zo,? 11 okt 2026/);
  });
});
