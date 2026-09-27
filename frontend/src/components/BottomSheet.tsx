import type { ReactNode } from "react";
import { theme } from "../theme";
import { useSheetDrag } from "./useSheetDrag";
import type { Snap } from "./useSheetDrag";
import { useMapInset } from "../map/useMapInsets";

/**
 * Map-first bottom sheet. The map stays fully interactive above it; only the
 * handle/header is a drag surface, so the inner list scrolls without fighting
 * the drag. Snaps to peek / half / full on release.
 */
export default function BottomSheet({
  children,
  initial = "half",
  label,
  headerLeft,
  headerRight,
  insetKey = "bottom-sheet",
  hidden = false,
  handleLabel = "Drag to resize list",
}: {
  children: ReactNode;
  initial?: Snap;
  label?: string;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  /** Map-inset registry key; a second sheet needs its own. */
  insetKey?: string;
  /** Keep the sheet mounted (its snap survives) but invisible, inert and not covering the map. */
  hidden?: boolean;
  handleLabel?: string;
}) {
  const { translate, restTranslate, dragging, handlers } = useSheetDrag(initial);

  // The sheet is a full-height element pushed DOWN by `translate`, so the part
  // on screen is only `viewport - translate`. Size the content area to exactly
  // that (minus the handle) so the list scrolls within the visible region at
  // every snap — otherwise its scroll viewport hangs below the fold and the
  // visible slice can't be scrolled. Recomputes whenever `translate` changes
  // (drag / snap / resize all update it).
  const HANDLE_H = 44;
  const viewport = typeof window === "undefined" ? 800 : window.innerHeight;
  const contentHeight = Math.max(viewport - translate - HANDLE_H, 0);

  // Tell the map how much of it the sheet covers at rest, so the camera frames
  // the visible part. Uses the settled snap, not the live finger position.
  useMapInset(insetKey, hidden ? null : { bottom: Math.max(viewport - restTranslate, 0) });

  return (
    <section
      aria-label={label}
      inert={hidden || undefined}
      aria-hidden={hidden || undefined}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        // Dynamic viewport height matches window.innerHeight (used for
        // contentHeight); plain 100vh is the URL-bar-hidden height and would
        // leave the footer floating a URL-bar's height above the real bottom.
        height: "100dvh",
        zIndex: 1000,
        transform: `translateY(${translate}px)`,
        transition: dragging ? "none" : "transform .28s cubic-bezier(.32,.72,0,1)",
        background: "#fff",
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        boxShadow: "0 -8px 30px rgba(0,0,0,.18)",
        display: "flex",
        flexDirection: "column",
        visibility: hidden ? "hidden" : undefined,
        pointerEvents: hidden ? "none" : undefined,
      }}
    >
      <div
        {...handlers}
        role="separator"
        aria-label={handleLabel}
        style={{
          position: "relative",
          flex: "none",
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "grab",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {headerLeft && (
          <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>{headerLeft}</span>
        )}
        <div style={{ width: 40, height: 5, borderRadius: 999, background: theme.color.borderStd }} />
        {headerRight && (
          <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
            {headerRight}
          </span>
        )}
      </div>
      <div style={{ height: contentHeight, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>{children}</div>
    </section>
  );
}
