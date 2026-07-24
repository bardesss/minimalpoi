import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDialog } from "./useDialog";

function Dialog({ onClose, closeOnBackdrop }: { onClose: () => void; closeOnBackdrop?: boolean }) {
  const { dialogRef, onBackdropClick } = useDialog<HTMLDivElement>(onClose, { closeOnBackdrop });
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
});
