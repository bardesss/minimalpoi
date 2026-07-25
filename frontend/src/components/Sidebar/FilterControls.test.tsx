import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterControls from "./FilterControls";

const base = {
  visited: "any" as const,
  onVisitedChange: () => {},
  sortMode: "recent" as const,
  onSortChange: () => {},
  viewMode: "fit" as const,
  onViewModeChange: () => {},
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
    await userEvent.click(screen.getByRole("button", { name: "Center" }));
    expect(onViewModeChange).toHaveBeenCalledWith("center");
  });
});
