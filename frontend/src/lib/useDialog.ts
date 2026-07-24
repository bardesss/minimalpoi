import { useEffect, useRef, type MouseEvent, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Module-level registry of mounted dialog instances (bottom → top). Only the
// top-most dialog responds to Escape, the Tab-trap, and hardware Back, so that
// stacking two dialogs (e.g. RouteFormModal + AddPlaceModal) doesn't close both
// on a single Escape/Back. Ids are stable per hook instance.
let dialogCounter = 0;
let dialogStack: number[] = [];
// When the top dialog is closed programmatically its cleanup calls
// history.back() to consume its own entry. That back() fires a popstate the
// browser delivers to the now-top (lower) dialog, which must NOT treat it as a
// hardware Back. This flag marks that echo so the lower dialog ignores it.
let suppressPop = false;

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

  // Stable per-instance id, assigned once on first render.
  const idRef = useRef(0);
  if (idRef.current === 0) idRef.current = ++dialogCounter;
  const myId = idRef.current;
  const isTop = () => dialogStack[dialogStack.length - 1] === myId;

  // Register on the stack for the lifetime of the mount. A StrictMode
  // double-invoke removes then re-adds the id, so it stays present exactly once.
  useEffect(() => {
    dialogStack.push(myId);
    return () => {
      dialogStack = dialogStack.filter((id) => id !== myId);
    };
  }, [myId]);

  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const focusables = node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    (focusables[0] ?? node)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      // Only the top-most dialog handles Escape and traps Tab.
      if (!isTop()) return;
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
    // Opening a dialog clears any stale suppression left by a programmatic
    // close whose echo popstate had no listener to consume it.
    suppressPop = false;
    window.history.pushState({ __dialog: true }, "");
    function onPop() {
      // Ignore (and clear) the echo of a lower/own programmatic history.back().
      if (suppressPop) {
        suppressPop = false;
        return;
      }
      // Only the top-most dialog consumes hardware Back. A lower dialog must
      // not set its own closedByPop (its history entry is still intact).
      if (!isTop()) return;
      closedByPop = true;
      onCloseRef.current();
    }
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Programmatic close: consume our own entry. Flag the resulting popstate
      // so the now-top lower dialog ignores it instead of closing too.
      if (!closedByPop) {
        suppressPop = true;
        window.history.back();
      }
    };
  }, []);

  function onBackdropClick(e: MouseEvent) {
    if (closeOnBackdrop && e.target === e.currentTarget) onCloseRef.current();
  }

  return { dialogRef, onBackdropClick };
}
