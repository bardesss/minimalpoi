import type { ReactNode } from "react";
import { theme } from "../theme";
import { useSheetDrag } from "./useSheetDrag";
import type { Snap } from "./useSheetDrag";

/**
 * Map-first bottom sheet. The map stays fully interactive above it; only the
 * handle/header is a drag surface, so the inner list scrolls without fighting
 * the drag. Snaps to peek / half / full on release.
 */
export default function BottomSheet({
  children,
  initial = "half",
  label,
  headerRight,
}: {
  children: ReactNode;
  initial?: Snap;
  label?: string;
  headerRight?: ReactNode;
}) {
  const { translate, dragging, handlers } = useSheetDrag(initial);

  // The sheet is a full-height element pushed DOWN by `translate`, so the part
  // on screen is only `viewport - translate`. Size the content area to exactly
  // that (minus the handle) so the list scrolls within the visible region at
  // every snap — otherwise its scroll viewport hangs below the fold and the
  // visible slice can't be scrolled. Recomputes whenever `translate` changes
  // (drag / snap / resize all update it).
  const HANDLE_H = 44;
  const viewport = typeof window === "undefined" ? 800 : window.innerHeight;
  const contentHeight = Math.max(viewport - translate - HANDLE_H, 0);

  return (
    <section
      aria-label={label}
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
      }}
    >
      <div
        {...handlers}
        role="separator"
        aria-label="Drag to resize list"
        style={{
          position: "relative",
          flex: "none",
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "grab",
          touchAction: "none",
        }}
      >
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
