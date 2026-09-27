import { useRef } from "react";
import type { Category, Poi } from "../types/api";
import { theme } from "../theme";
import { useDialog } from "../lib/useDialog";
import { useMapInset } from "../map/useMapInsets";
import { CloseButton, DetailBody, DetailHero, DetailSummary } from "./detail/DetailParts";
import DetailControls from "./detail/DetailControls";
import { useResetScrollOn } from "./detail/useResetScrollOn";

export const DETAIL_PANEL_WIDTH = 368;

export default function DetailPanel({
  poi,
  category,
  onClose,
  onEdit,
  onDelete,
}: {
  poi: Poi;
  category: Category | undefined;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Not a backdrop modal: Escape/back/return-focus always apply. The panel is
  // non-modal (it sits beside the list/map), so no focus trap.
  const { dialogRef } = useDialog<HTMLDivElement>(onClose, { closeOnBackdrop: false, trapFocus: false });
  // The panel sits over the map's left edge.
  useMapInset("detail-panel", { left: DETAIL_PANEL_WIDTH });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useResetScrollOn(scrollRef, poi.id);

  const close = <CloseButton onClick={onClose} style={{ position: "absolute", top: 14, right: 14 }} />;
  const footer = (
    <div style={{ display: "flex", gap: 9, padding: "14px 18px", paddingBottom: 14, borderTop: `1px solid ${theme.color.borderSubtle}`, background: "#fff", flex: "none" }}>
      <DetailControls key={poi.id} layout="footer" onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
  const content = (
    <div ref={scrollRef} className="poi-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      <DetailHero poi={poi} category={category} overlay={close} />
      <DetailSummary poi={poi} />
      <DetailBody poi={poi} />
    </div>
  );

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
