import { useEffect, useRef } from "react";

function isEditable(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
}

/**
 * Global "focus search" shortcut: `/` (only when not typing in a field) or
 * Ctrl/Cmd-K (from anywhere). Calls onActivate and preventDefaults.
 */
export function useSearchHotkey(onActivate: () => void): void {
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const cmdK = (e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K");
      const slash = e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditable(document.activeElement);
      if (cmdK || slash) {
        e.preventDefault();
        onActivateRef.current();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
