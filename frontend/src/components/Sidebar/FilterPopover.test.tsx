import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterPopover from "./FilterPopover";
import BottomSheet from "../BottomSheet";

const base = { visited: "any" as const, onVisitedChange: () => {}, sortMode: "recent" as const, onSortChange: () => {}, viewMode: "fit" as const, onViewModeChange: () => {}, density: "cards" as const, onDensityChange: () => {} };

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

  it("closes on Escape and returns focus to the trigger", async () => {
    render(<FilterPopover {...base} />);
    await userEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByLabelText(/sort places/i)).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByLabelText(/sort places/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /filters/i })).toHaveFocus();
  });

  it("closes when clicking the backdrop", async () => {
    render(<FilterPopover {...base} />);
    await userEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByLabelText(/sort places/i)).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("filter-backdrop"));
    expect(screen.queryByLabelText(/sort places/i)).not.toBeInTheDocument();
  });

  it("stays open while Tab moves focus between its controls", async () => {
    render(<FilterPopover {...base} />);
    await userEvent.click(screen.getByRole("button", { name: /filters/i }));
    const visitedSelect = screen.getByLabelText(/filter by visited/i);
    expect(visitedSelect).toHaveFocus();
    await userEvent.tab();
    // Popover must still be open — Tab traverses its three native controls
    // (Visited select, Sort select, Map view buttons) rather than closing it.
    expect(screen.getByLabelText(/sort places/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sort places/i)).toHaveFocus();
  });

  it("closes on a pointerdown outside it", async () => {
    render(<div><span>outside</span><FilterPopover {...base} /></div>);
    await userEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByLabelText(/sort places/i)).toBeInTheDocument();
    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByText("outside") });
    expect(screen.queryByLabelText(/sort places/i)).not.toBeInTheDocument();
  });

  it("lifts the surrounding sheet from peek to half when opened", async () => {
    render(
      <BottomSheet label="Places" initial="peek"><FilterPopover {...base} /></BottomSheet>,
    );
    const grip = screen.getByRole("separator");
    expect(grip).toHaveAttribute("aria-valuetext", "peek");
    await userEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(grip).toHaveAttribute("aria-valuetext", "half");
  });
});
