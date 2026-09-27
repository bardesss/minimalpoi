import { useEffect, type RefObject } from "react";

/** Scroll `ref` back to the top whenever `key` changes, so a newly shown
 * place doesn't open at the previous place's scroll position. */
export function useResetScrollOn(ref: RefObject<HTMLElement | null>, key: unknown): void {
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [ref, key]);
}
