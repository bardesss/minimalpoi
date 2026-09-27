import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterControls from "./FilterControls";

const base = {
  visited: "any" as const,
  onVisitedChange: () => {},
  sortMode: "recent" as const,
  onSortChange: () => {},
  viewMode: "fit" as const,
  onViewModeChange: () => {},
  density: "cards" as const,
  onDensityChange: () => {},
};

describe("FilterControls", () => {
  it("renders the three controls", () => {
    render(<FilterControls {...base} />);
    expect(screen.getByLabelText(/filter by visited/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sort places/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /map view/i })).toBeInTheDocument();
  });

  it("forwards a sort change", async () => {
    const onSortChange = vi.fn();
    render(<FilterControls {...base} onSortChange={onSortChange} />);
    await userEvent.selectOptions(screen.getByLabelText(/sort places/i), "name");
    expect(onSortChange).toHaveBeenCalledWith("name");
  });

  it("forwards a map-view change", async () => {
    const onViewModeChange = vi.fn();
    render(<FilterControls {...base} onViewModeChange={onViewModeChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Fixed view" }));
    expect(onViewModeChange).toHaveBeenCalledWith("center");
  });

  it("labels the map-view modes clearly, with tooltips", () => {
    render(<FilterControls visited="any" onVisitedChange={() => {}} sortMode="recent" onSortChange={() => {}} viewMode="fit" onViewModeChange={() => {}} density="cards" onDensityChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Auto-fit" })).toHaveAttribute("title", "Frame the map on the current results");
    expect(screen.getByRole("button", { name: "Fixed view" })).toHaveAttribute("title", "Keep the map where you leave it");
  });

  it("switches list density", async () => {
    const onDensityChange = vi.fn();
    render(<FilterControls visited="any" onVisitedChange={() => {}} sortMode="recent" onSortChange={() => {}} viewMode="fit" onViewModeChange={() => {}} density="cards" onDensityChange={onDensityChange} />);
    const group = screen.getByRole("group", { name: "List layout" });
    expect(within(group).getByRole("button", { name: "Cards" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(within(group).getByRole("button", { name: "List" }));
    expect(onDensityChange).toHaveBeenCalledWith("list");
  });
});
