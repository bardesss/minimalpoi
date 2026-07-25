import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SidebarHeader from "./SidebarHeader";

describe("SidebarHeader", () => {
  it("renders the full tagline", () => {
    render(<SidebarHeader onCollapse={vi.fn()} />);
    expect(screen.getByText("Points of Interest Manager")).toBeInTheDocument();
  });

  it("renders the nav slot when provided", () => {
    render(<SidebarHeader onCollapse={vi.fn()} nav={<button type="button">Switcher</button>} />);
    expect(screen.getByRole("button", { name: "Switcher" })).toBeInTheDocument();
  });

  it("renders a collapse control", () => {
    const onCollapse = vi.fn();
    render(<SidebarHeader onCollapse={onCollapse} />);
    expect(screen.getByRole("button", { name: /collapse panel/i })).toBeInTheDocument();
  });
});
