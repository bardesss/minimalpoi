import { describe, expect, it } from "vitest";
import { theme, tintFromColor, inputStyle, monoInputStyle, textareaStyle, ghostButtonStyle, fieldLabelStyle, toggleChipStyle, resultButtonStyle } from "./theme";

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

describe("shared style tokens", () => {
  it("fieldLabelStyle matches the settings label object", () => {
    expect(fieldLabelStyle).toMatchObject({ fontSize: 12, fontWeight: 700, color: theme.color.textBody, marginBottom: 6, display: "block" });
  });
  it("toggleChipStyle only tints when active", () => {
    expect(toggleChipStyle(false)).toMatchObject({ ...ghostButtonStyle, padding: "6px 12px" });
    expect(toggleChipStyle(true)).toMatchObject({ borderColor: theme.color.deepIndigoText, color: theme.color.deepIndigoText });
  });
  it("resultButtonStyle is a left-aligned pick button", () => {
    expect(resultButtonStyle).toMatchObject({ textAlign: "left", padding: "8px 10px", border: `1px solid ${theme.color.borderSubtle}` });
  });
});

function contrastOnWhite(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (L + 0.05); // (white 1.0 + .05) / (fg L + .05)
}

describe("contrast", () => {
  it("hint/coordinate text meets WCAG AA on white", () => {
    expect(contrastOnWhite(theme.color.textPlaceholder)).toBeGreaterThanOrEqual(4.5);
    expect(contrastOnWhite(theme.color.textCoord)).toBeGreaterThanOrEqual(4.5);
  });
});
