import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NavToggle from "./NavToggle";

describe("NavToggle", () => {
  it("renders Map and Routes links with correct hrefs", () => {
    render(<MemoryRouter><NavToggle active="map" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Routes" })).toHaveAttribute("href", "/routes");
  });

  it("marks the active segment with aria-current", () => {
    render(<MemoryRouter initialEntries={["/routes"]}><NavToggle active="routes" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Routes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Map" })).not.toHaveAttribute("aria-current");
  });
});
