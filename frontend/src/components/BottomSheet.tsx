import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { theme } from "../theme";

type Snap = "peek" | "half" | "full";
const ORDER: Snap[] = ["peek", "half", "full"];

/** Fraction of the viewport the sheet is translated DOWN by at each snap. */
const HIDE: Record<Snap, number> = { peek: 0.72, half: 0.48, full: 0.1 };

function vh(fraction: number): number {
  const h = typeof window === "undefined" ? 800 : window.innerHeight;
  return h * fraction;
}

/**
 * Map-first bottom sheet. The map stays fully interactive above it; only the
 * handle/header is a drag surface, so the inner list scrolls without fighting
 * the drag. Snaps to peek / half / full on release.
 */
export default function BottomSheet({
  children,
  initial = "half",
  label,
}: {
  children: ReactNode;
  initial?: Snap;
  label?: string;
}) {
  const [snap, setSnap] = useState<Snap>(initial);
  const [translate, setTranslate] = useState(() => vh(HIDE[initial]));
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startY: number; startT: number; moved: number } | null>(null);

  // Keep the resting position in sync with the viewport while not dragging.
  useEffect(() => {
    if (dragging) return;
    const apply = () => setTranslate(vh(HIDE[snap]));
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

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    d.moved = Math.max(d.moved, Math.abs(dy));
    const next = Math.min(Math.max(d.startT + dy, vh(HIDE.full)), vh(HIDE.peek));
    setTranslate(next);
  }, []);

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
      const dist = Math.abs(translate - vh(HIDE[s]));
      if (dist < bestDist) (bestDist = dist), (best = s);
    }
    setSnap(best);
  }, [translate]);

  return (
    <section
      aria-label={label}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: "100vh",
        zIndex: 1000,
        transform: `translateY(${translate}px)`,
        transition: dragging ? "none" : "transform .28s cubic-bezier(.32,.72,0,1)",
        background: "#fff",
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        boxShadow: "0 -8px 30px rgba(0,0,0,.18)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="separator"
        aria-label="Drag to resize list"
        style={{ flex: "none", padding: "10px 0 6px", cursor: "grab", touchAction: "none" }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 999, background: theme.color.borderStd, margin: "0 auto" }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>{children}</div>
    </section>
  );
}
