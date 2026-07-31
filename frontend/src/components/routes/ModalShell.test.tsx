import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ModalShell from "./ModalShell";

describe("ModalShell", () => {
  it("portals to document.body, outside a transformed ancestor", () => {
    const { container } = render(
      <div style={{ transform: "translateY(100px)" }}>
        <ModalShell label="Demo" onClose={vi.fn()}><p>body</p></ModalShell>
      </div>,
    );
    const dialog = screen.getByRole("dialog", { name: "Demo" });
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("closes on Escape and on a backdrop click, but not on a card click", () => {
    const onClose = vi.fn();
    render(<ModalShell label="Demo" onClose={onClose}><button>inside</button></ModalShell>);
    fireEvent.click(screen.getByText("inside"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("dialog", { name: "Demo" })); // backdrop = the labelled element
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("omits role when no label is given but forwards backdropProps", () => {
    render(
      <ModalShell onClose={vi.fn()} backdropProps={{ "data-testid": "bd" }}>
        <p>x</p>
      </ModalShell>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("bd")).toBeInTheDocument();
  });
});
