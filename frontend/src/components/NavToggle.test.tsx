import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NavToggle from "./NavToggle";

const loadRoutesPage = vi.hoisted(() => vi.fn(() => Promise.resolve({})));
vi.mock("../pages/loadRoutesPage", () => ({ loadRoutesPage }));

describe("NavToggle", () => {
  it("renders Map and Routes links with correct hrefs", () => {
    render(<MemoryRouter><NavToggle /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Routes" })).toHaveAttribute("href", "/routes");
  });

  // The active segment is derived from the current route via NavLink's
  // isActive, so aria-current and the highlight can no longer disagree.
  it("marks the active segment from the current route", () => {
    render(<MemoryRouter initialEntries={["/routes"]}><NavToggle /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Routes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Map" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Routes" })).toHaveStyle({ color: "rgb(255, 255, 255)" });
  });

  it("highlights Map on the map route", () => {
    render(<MemoryRouter initialEntries={["/"]}><NavToggle /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Map" })).toHaveStyle({ color: "rgb(255, 255, 255)" });
    expect(screen.getByRole("link", { name: "Routes" })).not.toHaveAttribute("aria-current");
  });

  // Warm the lazy routes chunk so the first switch to Routes doesn't flash the
  // full-screen loader.
  describe("routes prefetch", () => {
    afterEach(() => {
      vi.useRealTimers();
      loadRoutesPage.mockClear();
    });

    it("falls back to a timer when requestIdleCallback is missing (as in jsdom)", () => {
      vi.useFakeTimers();
      render(<MemoryRouter><NavToggle /></MemoryRouter>);
      expect(loadRoutesPage).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(loadRoutesPage).toHaveBeenCalledTimes(1);
    });

    it("uses requestIdleCallback when the browser has it, and cancels it on unmount", () => {
      const cancel = vi.fn();
      let idle: (() => void) | undefined;
      vi.stubGlobal("requestIdleCallback", vi.fn((cb: () => void, opts: { timeout: number }) => {
        idle = cb;
        expect(opts.timeout).toBe(5000);
        return 7;
      }));
      vi.stubGlobal("cancelIdleCallback", cancel);
      try {
        const { unmount } = render(<MemoryRouter><NavToggle /></MemoryRouter>);
        expect(loadRoutesPage).not.toHaveBeenCalled();
        idle?.();
        expect(loadRoutesPage).toHaveBeenCalledTimes(1);
        unmount();
        expect(cancel).toHaveBeenCalledWith(7);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it("prefetches right away when the Routes link is hovered or focused", () => {
      render(<MemoryRouter><NavToggle /></MemoryRouter>);
      fireEvent.pointerEnter(screen.getByRole("link", { name: "Routes" }));
      expect(loadRoutesPage).toHaveBeenCalled();
      loadRoutesPage.mockClear();
      fireEvent.focus(screen.getByRole("link", { name: "Routes" }));
      expect(loadRoutesPage).toHaveBeenCalled();
    });

    it("does not prefetch when already on the routes page", () => {
      vi.useFakeTimers();
      render(<MemoryRouter initialEntries={["/routes"]}><NavToggle /></MemoryRouter>);
      vi.runAllTimers();
      expect(loadRoutesPage).not.toHaveBeenCalled();
    });
  });
});
