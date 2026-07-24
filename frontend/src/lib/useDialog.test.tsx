import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDialog } from "./useDialog";

function Dialog({ onClose, closeOnBackdrop, trapFocus, manageHistory }: { onClose: () => void; closeOnBackdrop?: boolean; trapFocus?: boolean; manageHistory?: boolean }) {
  const { dialogRef, onBackdropClick } = useDialog<HTMLDivElement>(onClose, { closeOnBackdrop, trapFocus, manageHistory });
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

  it("closes on a popstate (hardware back)", () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);
    act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("pushes a history entry on open", () => {
    const push = vi.spyOn(window.history, "pushState");
    const { unmount } = render(<Dialog onClose={() => {}} />);
    expect(push).toHaveBeenCalled();
    unmount();
  });

  it("calls history.back() on unmount (default manageHistory)", () => {
    const back = vi.spyOn(window.history, "back");
    const { unmount } = render(<Dialog onClose={() => {}} />);
    unmount();
    expect(back).toHaveBeenCalled();
  });

  it("does not push a history entry on open when manageHistory is false", () => {
    const push = vi.spyOn(window.history, "pushState");
    const { unmount } = render(<Dialog onClose={() => {}} manageHistory={false} />);
    expect(push).not.toHaveBeenCalled();
    unmount();
  });

  it("does not call history.back() on unmount when manageHistory is false", () => {
    const back = vi.spyOn(window.history, "back");
    const { unmount } = render(<Dialog onClose={() => {}} manageHistory={false} />);
    unmount();
    expect(back).not.toHaveBeenCalled();
  });
});

describe("useDialog stacking", () => {
  it("Escape closes only the top-most (last-mounted) stacked dialog", () => {
    const onCloseBottom = vi.fn();
    const onCloseTop = vi.fn();
    render(
      <>
        <Dialog onClose={onCloseBottom} />
        <Dialog onClose={onCloseTop} />
      </>,
    );
    act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(onCloseTop).toHaveBeenCalledOnce();
    expect(onCloseBottom).not.toHaveBeenCalled();
  });

  it("promotes the new top after the previous top unmounts", () => {
    const onCloseBottom = vi.fn();
    const onCloseTop = vi.fn();
    function Stack({ showTop }: { showTop: boolean }) {
      return (
        <>
          <Dialog onClose={onCloseBottom} />
          {showTop && <Dialog onClose={onCloseTop} />}
        </>
      );
    }
    const { rerender } = render(<Stack showTop />);
    rerender(<Stack showTop={false} />);
    act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(onCloseBottom).toHaveBeenCalledOnce();
    expect(onCloseTop).not.toHaveBeenCalled();
  });

  it("popstate (hardware back) closes only the top-most stacked dialog", () => {
    const onCloseBottom = vi.fn();
    const onCloseTop = vi.fn();
    render(
      <>
        <Dialog onClose={onCloseBottom} />
        <Dialog onClose={onCloseTop} />
      </>,
    );
    act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(onCloseTop).toHaveBeenCalledOnce();
    expect(onCloseBottom).not.toHaveBeenCalled();
  });
});
