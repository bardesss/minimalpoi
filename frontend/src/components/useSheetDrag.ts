import { useCallback, useEffect, useRef, useState } from "react";

export type Snap = "peek" | "half" | "full";
const ORDER: Snap[] = ["peek", "half", "full"];

/** Default fraction of the viewport each snap is translated DOWN by. */
const DEFAULT_HIDE: Record<Snap, number> = { peek: 0.72, half: 0.48, full: 0.1 };

function vh(fraction: number): number {
  const h = typeof window === "undefined" ? 800 : window.innerHeight;
  return h * fraction;
}

export interface SheetDrag {
  translate: number;
  dragging: boolean;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
  };
}

/**
 * Drag-to-snap behaviour shared by the map-first sheets (the list sheet and the
 * mobile detail card): follow the finger vertically, then settle on the nearest
 * of peek / half / full on release; a tap with no real movement cycles toward
 * more open.
 */
export function useSheetDrag(initial: Snap): SheetDrag {
  const [snap, setSnap] = useState<Snap>(initial);
  const [translate, setTranslate] = useState(() => vh(DEFAULT_HIDE[initial]));
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startY: number; startT: number; moved: number } | null>(null);

  // Keep the resting position in sync with the viewport while not dragging.
  useEffect(() => {
    if (dragging) return;
    const apply = () => setTranslate(vh(DEFAULT_HIDE[snap]));
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [snap, dragging]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      drag.current = { startY: e.clientY, startT: translate, moved: 0 };
      setDragging(true);
    },
    [translate],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dy = e.clientY - d.startY;
      d.moved = Math.max(d.moved, Math.abs(dy));
      const next = Math.min(Math.max(d.startT + dy, vh(DEFAULT_HIDE.full)), vh(DEFAULT_HIDE.peek));
      setTranslate(next);
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    // A tap (negligible movement) cycles toward more open, then back to peek.
    if (d.moved < 6) {
      setSnap((s) => (s === "full" ? "peek" : ORDER[ORDER.indexOf(s) + 1]));
      return;
    }
    // Snap to whichever rest position the sheet is now closest to.
    let best: Snap = "peek";
    let bestDist = Infinity;
    for (const s of ORDER) {
      const dist = Math.abs(translate - vh(DEFAULT_HIDE[s]));
      if (dist < bestDist) {
        bestDist = dist;
        best = s;
      }
    }
    setSnap(best);
  }, [translate]);

  return {
    translate,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
