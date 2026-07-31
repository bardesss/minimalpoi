import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NavToggle from "./NavToggle";

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
});
