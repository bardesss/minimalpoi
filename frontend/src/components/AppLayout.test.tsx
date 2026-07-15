import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppLayout from "./AppLayout";

vi.mock("../lib/useMediaQuery", () => ({ useIsMobile: () => false }));

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
});
