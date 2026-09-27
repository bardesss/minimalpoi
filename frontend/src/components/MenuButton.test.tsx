import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MenuButton from "./MenuButton";

describe("MenuButton", () => {
  it("opens a menu, runs the chosen item and closes", async () => {
    const onDelete = vi.fn();
    render(<MenuButton label="⋯" ariaLabel="More actions" menuLabel="Place actions" items={[{ key: "delete", label: "Delete place", onSelect: onDelete, danger: true }]} />);
    const trigger = screen.getByRole("button", { name: "More actions" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await userEvent.click(trigger);
    expect(screen.getByRole("menu", { name: "Place actions" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete place" }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens upward when placement is above", async () => {
    render(<MenuButton label="⋯" ariaLabel="More" menuLabel="M" placement="above" items={[{ key: "a", label: "A", onSelect: () => {} }]} />);
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("menu").style.bottom).toBe("calc(100% + 4px)");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(<MenuButton label="⋯" ariaLabel="More" menuLabel="M" items={[{ key: "a", label: "A", onSelect: () => {} }]} />);
    const trigger = screen.getByRole("button", { name: "More" });
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("renders a non-interactive heading at the top of the menu", async () => {
    render(<MenuButton label="A" ariaLabel="Acct" menuLabel="Account" heading={<span>amy</span>} items={[{ key: "x", label: "X", onSelect: () => {} }]} />);
    await userEvent.click(screen.getByRole("button", { name: "Acct" }));
    expect(screen.getByText("amy")).toBeInTheDocument();
    // Visual only: the menu's aria-label carries the same information.
    expect(screen.getByText("amy").closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getAllByRole("menuitem")).toHaveLength(1);
  });
});
