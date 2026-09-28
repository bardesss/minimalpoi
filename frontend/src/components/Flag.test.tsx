import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import Flag from "./Flag";

describe("Flag", () => {
  it("renders an empty placeholder span before the flag set has loaded", async () => {
    vi.resetModules();
    const { default: FreshFlag } = await import("./Flag");
    const { container } = render(<FreshFlag code="nl" title="Netherlands" />);
    const span = container.querySelector("span");
    expect(span).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders an SVG for a valid country code once the flag set loads", async () => {
    const { container } = render(<Flag code="nl" title="Netherlands" />);
    await waitFor(() => {
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
    expect(container.querySelector("title")?.textContent).toBe("Netherlands");
  });

  it("renders nothing for a missing or invalid code", async () => {
    expect(render(<Flag code={null} />).container.querySelector("svg")).toBeNull();
    const { container } = render(<Flag code="ZZ" />);
    // give the lazy flag set a chance to load; an invalid code should still render nothing.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.querySelector("svg")).toBeNull();
  });
});
