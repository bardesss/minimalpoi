import type { Category, Poi } from "../../types/api";
import { useDialog } from "../../lib/useDialog";
import BottomSheet from "../BottomSheet";
import { CategoryPill, CloseButton, DetailBody, DetailHero, DetailSummary } from "./DetailParts";
import DetailControls from "./DetailControls";

/**
 * Mobile place detail: a draggable sheet over the map (peek / half / full)
 * that replaces the list sheet while a place is selected. Peek shows the name
 * and the action row; the map stays interactive above it.
 */
export default function DetailSheet({ poi, category, onClose, onEdit, onDelete }: { poi: Poi; category: Category | undefined; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const { dialogRef } = useDialog<HTMLDivElement>(onClose, { closeOnBackdrop: false, trapFocus: false });
  return (
    <BottomSheet label={poi.name} initial="peek" insetKey="detail-sheet" handleLabel="Drag to resize details">
      <div ref={dialogRef} className="poi-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
          <CategoryPill category={category} />
          <span style={{ flex: 1 }} />
          <DetailControls layout="header" onEdit={onEdit} onDelete={onDelete} trailing={<CloseButton onClick={onClose} style={{ boxShadow: "none", background: "#f5f4f2" }} />} />
        </div>
        <DetailSummary poi={poi} />
        <DetailHero poi={poi} category={category} compact />
        <div style={{ height: 16 }} />
        <DetailBody poi={poi} />
      </div>
    </BottomSheet>
  );
}
