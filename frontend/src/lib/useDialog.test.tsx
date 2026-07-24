import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDialog } from "./useDialog";

function Dialog({ onClose, closeOnBackdrop, trapFocus }: { onClose: () => void; closeOnBackdrop?: boolean; trapFocus?: boolean }) {
  const { dialogRef, onBackdropClick } = useDialog<HTMLDivElement>(onClose, { closeOnBackdrop, trapFocus });
  return (
    <div data-testid="backdrop" onClick={onBackdropClick}>
      <div ref={dialogRef} role="dialog">
        <button>first</button>
        <button>last</button>
      </div>
    </div>
  );
}

afterEach(() => vi.restoreAllMocks());

describe("useDialog", () => {
  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);
    act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("focuses the first focusable element on open", () => {
    render(<Dialog onClose={() => {}} />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "first" }));
  });

  it("returns focus to the previously focused element on unmount", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { unmount } = render(<Dialog onClose={() => {}} />);
    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("closes when the backdrop itself is clicked", () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);
    screen.getByTestId("backdrop").click();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not close when a child of the backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);
    screen.getByRole("button", { name: "first" }).click();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close on backdrop click when closeOnBackdrop is false", () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} closeOnBackdrop={false} />);
    screen.getByTestId("backdrop").click();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Tab cycles within the trap (default trapFocus)", () => {
    render(<Dialog onClose={() => {}} />);
    const firstButton = screen.getByRole("button", { name: "first" });
    const lastButton = screen.getByRole("button", { name: "last" });

    // Focus last button, then Tab should wrap to first
    lastButton.focus();
    act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })); });
    expect(document.activeElement).toBe(firstButton);

    // Focus first button, then Shift+Tab should wrap to last
    firstButton.focus();
    act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true })); });
    expect(document.activeElement).toBe(lastButton);
  });

  it("Tab is not intercepted when trapFocus is false", () => {
    render(<Dialog onClose={() => {}} trapFocus={false} />);
    const lastButton = screen.getByRole("button", { name: "last" });

    // Focus last button and dispatch Tab
    lastButton.focus();
    act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })); });

    // Focus should still be on last (not wrapped to first)
    expect(document.activeElement).toBe(lastButton);
  });
});
