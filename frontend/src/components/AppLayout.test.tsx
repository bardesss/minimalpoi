import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppLayout from "./AppLayout";
import { stubMediaQueries } from "../test/utils";

// useIsMobile and useMediaQuery both defer to window.matchMedia, so
// individual tests can override it (e.g. the very-wide-viewport breakpoint
// or the mobile breakpoint) the same way other suites stub matchMedia. The
// global jsdom stub answers false for every query (desktop layout).
vi.mock("../lib/useMediaQuery", () => ({
  useIsMobile: () =>
    typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 768px)").matches : false,
  useMediaQuery: (query: string) =>
    typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false,
}));

// Overrides matchMedia so `(min-width: 1600px)` matches, mirroring the
// mobile-override pattern used elsewhere in the suite. Returns a restore fn.
function mockWideMatchMedia() {
  const original = window.matchMedia;
  window.matchMedia = ((q: string) => ({
    matches: q === "(min-width: 1600px)",
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

const account = { username: "amy", role: "admin", onLogout: vi.fn(), onOpenSettings: vi.fn(), updateAvailable: false };

function renderLayout(over: Partial<React.ComponentProps<typeof AppLayout>> = {}) {
  return render(
    <MemoryRouter>
      <AppLayout
        routesEnabled sheetLabel="Places" collapsed={false}
        onCollapse={vi.fn()} onExpand={vi.fn()} reopenLabel="» 2 places"
        sidebar={<div>SIDEBAR</div>} main={<div>MAIN</div>} account={account}
        {...over}
      />
    </MemoryRouter>,
  );
}

describe("AppLayout", () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it("renders sidebar, main, nav toggle and the account menu", () => {
    renderLayout();
    expect(screen.getByText("SIDEBAR")).toBeInTheDocument();
    expect(screen.getByText("MAIN")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Routes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account (amy)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
  });

  it("mobile: nav and account live in the sheet's handle row (no brand row, no footer)", () => {
    restore = stubMediaQueries((q) => q === "(max-width: 768px)");
    renderLayout();
    const handle = screen.getByRole("separator", { name: /drag to resize list/i });
    expect(within(handle).getByRole("button", { name: "Account (amy)" })).toBeInTheDocument();
    expect(within(handle).getByRole("link", { name: "Routes" })).toBeInTheDocument();
    expect(screen.queryByText("MinimalPOI")).not.toBeInTheDocument();
  });

  it("hides the nav toggle when routes are disabled", () => {
    renderLayout({ routesEnabled: false });
    expect(screen.queryByRole("link", { name: "Routes" })).not.toBeInTheDocument();
  });

  it("shows the reopen button when collapsed", () => {
    renderLayout({ collapsed: true });
    expect(screen.getByRole("button", { name: /2 places/i })).toBeInTheDocument();
    expect(screen.queryByText("SIDEBAR")).not.toBeInTheDocument();
  });

  it("widens the sidebar on very wide viewports", () => {
    const restore = mockWideMatchMedia();
    try {
      const { container } = renderLayout();
      const aside = container.querySelector("aside");
      expect(aside).toHaveStyle({ width: "640px" });
    } finally {
      restore();
    }
  });
});
