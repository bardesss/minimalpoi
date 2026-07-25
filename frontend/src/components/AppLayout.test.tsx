import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppLayout from "./AppLayout";

// useIsMobile is forced false (desktop layout); useMediaQuery defers to
// window.matchMedia so individual tests can override it (e.g. the
// very-wide-viewport breakpoint) the same way other suites stub matchMedia.
vi.mock("../lib/useMediaQuery", () => ({
  useIsMobile: () => false,
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
        active="map" routesEnabled sheetLabel="Places" collapsed={false}
        onCollapse={vi.fn()} onExpand={vi.fn()} reopenLabel="» 2 places"
        sidebar={<div>SIDEBAR</div>} main={<div>MAIN</div>} account={account}
        {...over}
      />
    </MemoryRouter>,
  );
}

describe("AppLayout", () => {
  it("renders sidebar, main, nav toggle and account footer", () => {
    renderLayout();
    expect(screen.getByText("SIDEBAR")).toBeInTheDocument();
    expect(screen.getByText("MAIN")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Routes" })).toBeInTheDocument();
    expect(screen.getByText("amy")).toBeInTheDocument();
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

  it("shows the place count in the sidebar header when sheetCount is set", () => {
    renderLayout({ sheetCount: 40 });
    expect(screen.getByText("40 places")).toBeInTheDocument();
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
