import { useCallback, useEffect, useRef, useState } from "react";

export type Snap = "peek" | "half" | "full";
const ORDER: Snap[] = ["peek", "half", "full"];

/** Default fraction of the viewport each snap is translated DOWN by. */
const DEFAULT_HIDE: Record<Snap, number> = { peek: 0.72, half: 0.48, full: 0.1 };

function vh(fraction: number): number {
  const h = typeof window === "undefined" ? 800 : window.innerHeight;
  return h * fraction;
}

/** Release speed (px/ms) above which a drag counts as a fling. */
export const FLING_VELOCITY = 0.5;

/** Only movement this recent (ms before release) counts toward the fling speed,
 * so a quick drag followed by a hold settles on the nearest snap instead. */
const FLING_WINDOW_MS = 80;

/** One snap further in the fling's direction (positive velocity = downward =
 * less open), clamped at the ends; null when the release was too slow. */
export function flingSnap(start: Snap, velocity: number): Snap | null {
  if (Math.abs(velocity) < FLING_VELOCITY) return null;
  const i = ORDER.indexOf(start) + (velocity < 0 ? 1 : -1);
  return ORDER[Math.min(Math.max(i, 0), ORDER.length - 1)];
}

export interface SheetDrag {
  translate: number;
  /** Translate of the current snap — changes only when a snap settles or the viewport resizes. */
  restTranslate: number;
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
 * more open; a quick flick moves at least one snap in the flick's direction
 * (further if the finger already dragged the sheet past it).
 */
export function useSheetDrag(initial: Snap): SheetDrag {
  const [snap, setSnap] = useState<Snap>(initial);
  const [translate, setTranslate] = useState(() => vh(DEFAULT_HIDE[initial]));
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    startY: number;
    startT: number;
    moved: number;
    startSnap: Snap;
    samples: { y: number; t: number }[];
  } | null>(null);

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
      if ((e.target as Element | null)?.closest?.('button, a, [role="menu"]')) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      drag.current = {
        startY: e.clientY,
        startT: translate,
        moved: 0,
        startSnap: snap,
        samples: [{ y: e.clientY, t: performance.now() }],
      };
      setDragging(true);
    },
    [translate, snap],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dy = e.clientY - d.startY;
      d.moved = Math.max(d.moved, Math.abs(dy));
      const next = Math.min(Math.max(d.startT + dy, vh(DEFAULT_HIDE.full)), vh(DEFAULT_HIDE.peek));
      setTranslate(next);
      d.samples.push({ y: e.clientY, t: performance.now() });
      const newest = d.samples[d.samples.length - 1];
      while (d.samples.length > 2 && newest.t - d.samples[0].t > 100) d.samples.shift();
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    const releasedAt = performance.now();
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    // A tap (negligible movement) cycles toward more open, then back to peek.
    if (d.moved < 6) {
      setSnap((s) => (s === "full" ? "peek" : ORDER[ORDER.indexOf(s) + 1]));
      return;
    }
    // Whichever rest position the sheet is now closest to.
    let best: Snap = "peek";
    let bestDist = Infinity;
    for (const s of ORDER) {
      const dist = Math.abs(translate - vh(DEFAULT_HIDE[s]));
      if (dist < bestDist) {
        bestDist = dist;
        best = s;
      }
    }
    // Speed over the last moments before release (measured up to the release
    // itself, so a pause before lifting the finger cancels the fling).
    const recent = d.samples.filter((s) => releasedAt - s.t <= FLING_WINDOW_MS);
    let velocity = 0;
    if (recent.length >= 2) {
      const dt = releasedAt - recent[0].t;
      velocity = dt > 0 ? (recent[recent.length - 1].y - recent[0].y) / dt : 0;
    }
    // A quick flick moves at least one snap in its direction; a long fast
    // swipe that already passed that snap keeps the further one.
    const flung = flingSnap(d.startSnap, velocity);
    if (flung) {
      const pick = velocity < 0 ? Math.max : Math.min;
      best = ORDER[pick(ORDER.indexOf(best), ORDER.indexOf(flung))];
    }
    setSnap(best);
  }, [translate]);

  return {
    translate,
    restTranslate: vh(DEFAULT_HIDE[snap]),
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
