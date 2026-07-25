import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SidebarHeader from "./SidebarHeader";

describe("SidebarHeader", () => {
  it("renders the full tagline", () => {
    render(<SidebarHeader onCollapse={vi.fn()} />);
    expect(screen.getByText("Points of Interest Manager")).toBeInTheDocument();
  });

  it("renders the place count when provided", () => {
    render(<SidebarHeader onCollapse={vi.fn()} count={40} />);
    expect(screen.getByText("40 places")).toBeInTheDocument();
  });

  it("renders no place count when omitted", () => {
    render(<SidebarHeader onCollapse={vi.fn()} />);
    expect(screen.queryByText(/places/)).not.toBeInTheDocument();
  });
});
