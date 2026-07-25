import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterPopover from "./FilterPopover";

const base = { visited: "any" as const, onVisitedChange: () => {}, sortMode: "recent" as const, onSortChange: () => {}, viewMode: "fit" as const, onViewModeChange: () => {} };

describe("FilterPopover", () => {
  it("opens the popover and exposes the three controls", async () => {
    render(<FilterPopover {...base} />);
    expect(screen.queryByLabelText(/sort places/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByLabelText(/filter by visited/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sort places/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /map view/i })).toBeInTheDocument();
  });

  it("marks the trigger active when a non-default visited filter is set", () => {
    render(<FilterPopover {...base} visited="visited" />);
    expect(screen.getByRole("button", { name: /filters/i })).toHaveAttribute("data-active", "true");
  });

  it("forwards sort changes", async () => {
    const onSortChange = vi.fn();
    render(<FilterPopover {...base} onSortChange={onSortChange} />);
    await userEvent.click(screen.getByRole("button", { name: /filters/i }));
    await userEvent.selectOptions(screen.getByLabelText(/sort places/i), "name");
    expect(onSortChange).toHaveBeenCalledWith("name");
  });
});
