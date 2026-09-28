import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category } from "../../types/api";
import CategoryChips from "./CategoryChips";

const mockCategories: Category[] = [
  { id: 1, name: "Food", color: "#FF6B6B", icon: null, created_by: 1 },
  { id: 2, name: "Nature", color: "#4ECDC4", icon: null, created_by: 1 },
];

describe("CategoryChips", () => {
  it("renders with default padding when scroll is false", () => {
    const onToggle = vi.fn();
    const onClear = vi.fn();
    render(<CategoryChips categories={mockCategories} activeIds={[]} onToggle={onToggle} onClear={onClear} scroll={false} />);
    const container = screen.getByRole("button", { name: "All" }).parentElement;
    expect(container?.style.padding).toBe("12px 20px");
  });

  it("renders with compact padding when scroll is true", () => {
    const onToggle = vi.fn();
    const onClear = vi.fn();
    render(<CategoryChips categories={mockCategories} activeIds={[]} onToggle={onToggle} onClear={onClear} scroll />);
    const container = screen.getByRole("button", { name: "All" }).parentElement;
    expect(container?.style.padding).toBe("6px 20px");
  });

  it("toggles category on chip click", async () => {
    const onToggle = vi.fn();
    const onClear = vi.fn();
    render(<CategoryChips categories={mockCategories} activeIds={[]} onToggle={onToggle} onClear={onClear} />);
    await userEvent.click(screen.getByRole("button", { name: "Food" }));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it("clears categories when All is clicked", async () => {
    const onToggle = vi.fn();
    const onClear = vi.fn();
    render(<CategoryChips categories={mockCategories} activeIds={[1]} onToggle={onToggle} onClear={onClear} />);
    await userEvent.click(screen.getByRole("button", { name: "All" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("shows uncategorized chip when showUncategorized is true", () => {
    const onToggle = vi.fn();
    const onClear = vi.fn();
    render(<CategoryChips categories={mockCategories} activeIds={[]} onToggle={onToggle} onClear={onClear} showUncategorized />);
    expect(screen.getByRole("button", { name: "Uncategorized" })).toBeInTheDocument();
  });
});
