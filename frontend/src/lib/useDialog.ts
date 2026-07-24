import { useEffect, useRef, type MouseEvent, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface UseDialogOptions {
  closeOnBackdrop?: boolean;
  trapFocus?: boolean;
}

export function useDialog<T extends HTMLElement = HTMLElement>(
  onClose: () => void,
  opts: UseDialogOptions = {},
): { dialogRef: RefObject<T | null>; onBackdropClick: (e: MouseEvent) => void } {
  const { closeOnBackdrop = true, trapFocus = true } = opts;
  const dialogRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const focusables = node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    (focusables[0] ?? node)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && trapFocus && node) {
        const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) {
          e.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      prevActive?.focus?.();
    };
  }, [trapFocus]);

  // Mobile hardware Back / iOS edge-swipe: consume a dedicated history entry so
  // Back closes the dialog instead of navigating the SPA away. A programmatic
  // close (Escape/backdrop/×) unmounts the hook and pops our own entry.
  useEffect(() => {
    let closedByPop = false;
    window.history.pushState({ __dialog: true }, "");
    function onPop() {
      closedByPop = true;
      onCloseRef.current();
    }
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (!closedByPop) window.history.back();
    };
  }, []);

  function onBackdropClick(e: MouseEvent) {
    if (closeOnBackdrop && e.target === e.currentTarget) onCloseRef.current();
  }

  return { dialogRef, onBackdropClick };
}
