import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SidebarHeader from "./SidebarHeader";

describe("SidebarHeader", () => {
  it("renders the full tagline", () => {
    render(<SidebarHeader onCollapse={vi.fn()} />);
    expect(screen.getByText("Points of Interest Manager")).toBeInTheDocument();
  });
});
