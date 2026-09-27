import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DetailControls from "./DetailControls";

describe("DetailControls", () => {
  it("edits from the primary button", async () => {
    const onEdit = vi.fn();
    render(<DetailControls layout="footer" onEdit={onEdit} onDelete={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /edit place/i }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("deletes only after choosing Delete in the menu and confirming", async () => {
    const onDelete = vi.fn();
    render(<DetailControls layout="footer" onEdit={() => {}} onDelete={onDelete} />);
    expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /more actions/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /delete place/i }));
    expect(screen.getByText(/delete this place\?/i)).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("cancels the confirmation", async () => {
    render(<DetailControls layout="footer" onEdit={() => {}} onDelete={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /more actions/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /delete place/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByRole("button", { name: /edit place/i })).toBeInTheDocument();
  });

  it("renders the trailing slot in the header layout", () => {
    render(<DetailControls layout="header" onEdit={() => {}} onDelete={() => {}} trailing={<button>Close</button>} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit place/i })).toBeInTheDocument();
  });

  async function armConfirm() {
    await userEvent.click(screen.getByRole("button", { name: /more actions/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /delete place/i }));
  }

  it("moves focus to Cancel when the confirmation appears, and back to the menu trigger after Cancel", async () => {
    render(<DetailControls layout="footer" onEdit={() => {}} onDelete={() => {}} />);
    await armConfirm();
    expect(screen.getByRole("button", { name: /cancel/i })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByRole("button", { name: /more actions/i })).toHaveFocus();
  });

  it("cancels the confirmation on Escape and returns focus to the menu trigger", async () => {
    const onDelete = vi.fn();
    render(<DetailControls layout="footer" onEdit={() => {}} onDelete={onDelete} />);
    await armConfirm();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText(/delete this place\?/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /more actions/i })).toHaveFocus();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it.each(["footer", "header"] as const)("keeps every control at least 44px tall (%s layout)", async (layout) => {
    render(<DetailControls layout={layout} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByRole("button", { name: /edit place/i }).style.minHeight).toBe("44px");
    await armConfirm();
    expect(screen.getByRole("button", { name: /cancel/i }).style.minHeight).toBe("44px");
    expect(screen.getByRole("button", { name: /^delete$/i }).style.minHeight).toBe("44px");
  });
});
