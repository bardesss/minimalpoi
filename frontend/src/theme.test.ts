import { describe, expect, it } from "vitest";
import { theme, tintFromColor, inputStyle, monoInputStyle, textareaStyle } from "./theme";

describe("theme", () => {
  it("exposes the brand indigo", () => {
    expect(theme.color.primary).toBe("#4f46e5");
  });

  it("derives a light tint mixed 85% toward white", () => {
    // (225,87,76) -> (251,230,228)
    expect(tintFromColor("#E1574C")).toBe("#fbe6e4");
  });

  it("normalizes shorthand and casing", () => {
    expect(tintFromColor("#fff")).toBe("#ffffff");
  });
});

describe("shared input styles", () => {
  it("do not suppress the focus outline (focus-visible handles it in CSS)", () => {
    for (const s of [inputStyle, monoInputStyle, textareaStyle]) {
      expect(s.outline).not.toBe("none");
    }
  });
});
