import { describe, expect, it } from "vitest";
import { safeImageCss, safeLinkHref } from "./safeUrl";

describe("safeLinkHref", () => {
  it("allows http and https absolute URLs", () => {
    expect(safeLinkHref("https://place.nl")).toBe("https://place.nl");
    expect(safeLinkHref("http://place.nl/menu?lang=nl")).toBe("http://place.nl/menu?lang=nl");
  });

  it("allows site-relative paths but not protocol-relative", () => {
    expect(safeLinkHref("/images/x.png")).toBe("/images/x.png");
    expect(safeLinkHref("//evil.com")).toBeNull();
  });

  it("rejects dangerous schemes (stored-XSS guard)", () => {
    expect(safeLinkHref("javascript:alert(1)")).toBeNull();
    expect(safeLinkHref("JavaScript:alert(1)")).toBeNull();
    expect(safeLinkHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeLinkHref("vbscript:msgbox(1)")).toBeNull();
  });

  it("rejects bare domains, empty, and nullish", () => {
    expect(safeLinkHref("place.nl")).toBeNull();
    expect(safeLinkHref("")).toBeNull();
    expect(safeLinkHref("   ")).toBeNull();
    expect(safeLinkHref(null)).toBeNull();
    expect(safeLinkHref(undefined)).toBeNull();
  });
});

describe("safeImageCss", () => {
  it("allows safe http(s)/relative image URLs", () => {
    expect(safeImageCss("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(safeImageCss("/images/a.png")).toBe("/images/a.png");
  });

  it("rejects values that could break the url() token", () => {
    expect(safeImageCss('https://x/a.png"),color:red')).toBeNull();
    expect(safeImageCss("https://x/a.png)")).toBeNull();
    expect(safeImageCss("https://x/a b.png")).toBeNull();
    expect(safeImageCss("javascript:alert(1)")).toBeNull();
    expect(safeImageCss(null)).toBeNull();
  });
});
