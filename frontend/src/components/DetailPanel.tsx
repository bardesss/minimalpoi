import type { Category, Poi } from "../types/api";
import { theme } from "../theme";
import { useDialog } from "../lib/useDialog";
import { useMapInset } from "../map/useMapInsets";
import { CloseButton, DetailBody, DetailHero, DetailSummary } from "./detail/DetailParts";
import DetailControls from "./detail/DetailControls";

export const DETAIL_PANEL_WIDTH = 368;

export default function DetailPanel({
  poi,
  category,
  onClose,
  onEdit,
  onDelete,
  mobile = false,
}: {
  poi: Poi;
  category: Category | undefined;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  mobile?: boolean;
}) {
  // Not a backdrop modal: Escape/back/return-focus always apply, but the
  // focus trap only makes sense in the full-screen mobile branch — the
  // desktop side panel is non-modal and trapping it would strand keyboard
  // focus away from the list/map.
  const { dialogRef } = useDialog<HTMLDivElement>(onClose, { closeOnBackdrop: false, trapFocus: mobile });
  // The desktop panel sits over the map's left edge; the mobile view is a
  // full-screen overlay, so the map behind it needs no padding.
  useMapInset("detail-panel", mobile ? null : { left: DETAIL_PANEL_WIDTH });

  const close = <CloseButton onClick={onClose} style={{ position: "absolute", top: mobile ? "calc(14px + env(safe-area-inset-top))" : 14, right: 14 }} />;
  const footer = (
    <div style={{ display: "flex", gap: 9, padding: "14px 18px", paddingBottom: mobile ? "calc(14px + env(safe-area-inset-bottom))" : 14, borderTop: `1px solid ${theme.color.borderSubtle}`, background: "#fff", flex: "none" }}>
      <DetailControls layout="footer" onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
  const content = (
    <div className="poi-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      <DetailHero poi={poi} category={category} overlay={close} />
      <DetailSummary poi={poi} />
      <DetailBody poi={poi} />
    </div>
  );

  if (mobile) {
    return (
      <section ref={dialogRef} aria-label={poi.name} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "#fff", display: "flex", flexDirection: "column" }}>
        {content}
        {footer}
      </section>
    );
  }

  return (
    <div
      ref={dialogRef}
      style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: DETAIL_PANEL_WIDTH, zIndex: 800, background: "#fff", boxShadow: theme.shadow.detail, display: "flex", flexDirection: "column", animation: "slideIn .22s ease" }}
    >
      {content}
      {footer}
    </div>
  );
}
