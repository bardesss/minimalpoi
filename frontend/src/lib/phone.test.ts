import { describe, expect, it } from "vitest";
import { telHref } from "./phone";

describe("telHref", () => {
  it("keeps a leading + and the digits only", () => {
    expect(telHref("+31 20 123 4567")).toBe("tel:+31201234567");
    expect(telHref("(020) 123-4567")).toBe("tel:0201234567");
  });
  it("returns null for empty or undiallable values", () => {
    expect(telHref(null)).toBeNull();
    expect(telHref("")).toBeNull();
    expect(telHref("ab")).toBeNull();
    expect(telHref("12")).toBeNull();
  });
  it("never lets a scheme or script through", () => {
    expect(telHref("javascript:alert(1)//123")).toBe("tel:1123");
  });
});
