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
}: {
  children: ReactNode;
  initial?: Snap;
  label?: string;
}) {
  const { translate, dragging, handlers } = useSheetDrag(initial);

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
        {...handlers}
        role="separator"
        aria-label="Drag to resize list"
        style={{
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
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>{children}</div>
    </section>
  );
}
