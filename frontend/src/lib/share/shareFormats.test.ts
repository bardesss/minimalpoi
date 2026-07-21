import { describe, expect, it } from "vitest";
import { SHARE_FORMATS, shareFormat } from "./shareFormats";

describe("shareFormats", () => {
  it("defines all three formats with the exact social dimensions", () => {
    expect(SHARE_FORMATS.map((f) => f.key)).toEqual(["square", "story", "landscape"]);
    expect(shareFormat("square")).toMatchObject({ width: 1080, height: 1080 });
    expect(shareFormat("story")).toMatchObject({ width: 1080, height: 1920 });
    expect(shareFormat("landscape")).toMatchObject({ width: 1200, height: 675 });
  });
  it("has a positive fit padding for each", () => {
    for (const f of SHARE_FORMATS) expect(f.fitPadding).toBeGreaterThan(0);
  });
  it("throws on an unknown format", () => {
    expect(() => shareFormat("bogus" as any)).toThrow();
  });
});
