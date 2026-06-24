import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { CategoryIcon } from "./categoryIcon";

describe("CategoryIcon", () => {
  it("renders an svg for a known icon name", () => {
    const { container } = render(<CategoryIcon name="utensils" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("falls back to a pin svg for null/unknown", () => {
    const { container } = render(<CategoryIcon name={null} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
