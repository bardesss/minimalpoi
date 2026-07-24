import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query. SSR/test-safe: when `matchMedia` is
 * unavailable (jsdom), it resolves to `false` so the desktop layout renders.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** True on phone-sized viewports (≤768px). */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 768px)");
}

/** True for touch/coarse pointers (finger-driven, imprecise) — e.g. a wide-viewport
 * touch tablet that wouldn't otherwise match `useIsMobile`'s width breakpoint. */
export function useIsCoarsePointer(): boolean {
  return useMediaQuery("(pointer: coarse)");
}
