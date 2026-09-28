import { describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
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

  it("swallows a failed flag-set load and retries it on a later mount", async () => {
    // First load fails (e.g. a stale chunk 404 after a deploy), later ones succeed.
    let loads = 0;
    vi.doMock("country-flag-icons/react/3x2", async () => {
      loads += 1;
      if (loads === 1) throw new Error("chunk failed to load");
      return { NL: () => <svg data-testid="nl-flag" /> };
    });
    try {
      vi.resetModules();
      const { default: FreshFlag } = await import("./Flag");
      const first = render(<FreshFlag code="nl" />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(loads).toBe(1);
      expect(first.container.querySelector("svg")).toBeNull();
      first.unmount();

      const second = render(<FreshFlag code="nl" />);
      await waitFor(() => {
        expect(second.getByTestId("nl-flag")).toBeInTheDocument();
      });
      expect(loads).toBe(2);
    } finally {
      vi.doUnmock("country-flag-icons/react/3x2");
    }
  });
});
