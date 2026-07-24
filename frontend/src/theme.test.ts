import { describe, expect, it } from "vitest";
import { inputStyle, monoInputStyle, textareaStyle } from "./theme";

describe("shared input styles", () => {
  it("do not suppress the focus outline (focus-visible handles it in CSS)", () => {
    for (const s of [inputStyle, monoInputStyle, textareaStyle]) {
      expect(s.outline).not.toBe("none");
    }
  });
});
