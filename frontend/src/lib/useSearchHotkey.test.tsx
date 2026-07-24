import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSearchHotkey } from "./useSearchHotkey";

function Harness({ onActivate }: { onActivate: () => void }) {
  useSearchHotkey(onActivate);
  return (
    <div>
      <input aria-label="other" />
      <textarea aria-label="ta" />
    </div>
  );
}

function press(key: string, opts: KeyboardEventInit = {}) {
  act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts })); });
}

afterEach(() => vi.restoreAllMocks());

describe("useSearchHotkey", () => {
  it("activates on '/' when focus is not in a field", () => {
    const onActivate = vi.fn();
    render(<Harness onActivate={onActivate} />);
    (document.activeElement as HTMLElement)?.blur?.();
    press("/");
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it("does NOT activate on '/' while typing in an input", () => {
    const onActivate = vi.fn();
    const { getByLabelText } = render(<Harness onActivate={onActivate} />);
    (getByLabelText("other") as HTMLInputElement).focus();
    press("/");
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("does NOT activate on '/' while typing in a textarea", () => {
    const onActivate = vi.fn();
    const { getByLabelText } = render(<Harness onActivate={onActivate} />);
    (getByLabelText("ta") as HTMLTextAreaElement).focus();
    press("/");
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("activates on Ctrl-K even from within an input", () => {
    const onActivate = vi.fn();
    const { getByLabelText } = render(<Harness onActivate={onActivate} />);
    (getByLabelText("other") as HTMLInputElement).focus();
    press("k", { ctrlKey: true });
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it("activates on Cmd-K (metaKey)", () => {
    const onActivate = vi.fn();
    render(<Harness onActivate={onActivate} />);
    press("k", { metaKey: true });
    expect(onActivate).toHaveBeenCalledOnce();
  });
});
