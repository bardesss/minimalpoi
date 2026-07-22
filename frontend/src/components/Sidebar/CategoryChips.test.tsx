import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category } from "../../types/api";
import CategoryChips from "./CategoryChips";

const cats: Category[] = [
  { id: 1, name: "Restaurants", color: "#E1574C", icon: null, created_by: 1, trip_category_id: null, trip_sync_status: "s" },
  { id: 2, name: "Nature", color: "#2F9E63", icon: null, created_by: 1, trip_category_id: null, trip_sync_status: "s" },
];

describe("CategoryChips", () => {
  it("toggles a category and clears via All", async () => {
    const onToggle = vi.fn();
    const onClear = vi.fn();
    render(<CategoryChips categories={cats} activeIds={[1]} onToggle={onToggle} onClear={onClear} />);
    await userEvent.click(screen.getByRole("button", { name: /nature/i }));
    expect(onToggle).toHaveBeenCalledWith(2);
    await userEvent.click(screen.getByRole("button", { name: /^all$/i }));
    expect(onClear).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /restaurants/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows an Uncategorized chip only when requested and toggles it", async () => {
    const onToggle = vi.fn();
    const { rerender } = render(<CategoryChips categories={cats} activeIds={[]} onToggle={onToggle} onClear={() => {}} />);
    expect(screen.queryByRole("button", { name: /uncategorized/i })).not.toBeInTheDocument();
    rerender(<CategoryChips categories={cats} activeIds={[]} onToggle={onToggle} onClear={() => {}} showUncategorized />);
    await userEvent.click(screen.getByRole("button", { name: /uncategorized/i }));
    expect(onToggle).toHaveBeenCalledWith(0);
  });
});
