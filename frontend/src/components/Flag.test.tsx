import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import Flag from "./Flag";

describe("Flag", () => {
  it("renders an SVG for a valid country code", () => {
    const { container } = render(<Flag code="nl" title="Netherlands" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(container.querySelector("title")?.textContent).toBe("Netherlands");
  });

  it("renders nothing for a missing or invalid code", () => {
    expect(render(<Flag code={null} />).container.querySelector("svg")).toBeNull();
    expect(render(<Flag code="ZZ" />).container.querySelector("svg")).toBeNull();
  });
});
