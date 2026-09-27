import type { Category, Poi } from "../../types/api";
import { ghostButtonStyle, theme } from "../../theme";
import { useDialog } from "../../lib/useDialog";
import { DetailBody, DetailHero, DetailSummary } from "./DetailParts";
import DetailControls from "./DetailControls";

/**
 * Narrow-desktop place detail (769–1279px): shown inside the sidebar in place
 * of the list, so the map keeps its full width. "Back to list" returns to the
 * list, which stayed mounted (scroll position intact).
 */
export default function SidebarDetail({ poi, category, onClose, onEdit, onDelete }: { poi: Poi; category: Category | undefined; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const { dialogRef } = useDialog<HTMLDivElement>(onClose, { closeOnBackdrop: false, trapFocus: false });
  return (
    <div ref={dialogRef} role="region" aria-label={poi.name} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#fff" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.color.borderSubtle}`, flex: "none" }}>
        <button type="button" className="hover-btn" onClick={onClose} style={{ ...ghostButtonStyle, padding: "6px 12px" }}>← Back to list</button>
      </div>
      <div className="poi-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <DetailHero poi={poi} category={category} />
        <DetailSummary poi={poi} />
        <DetailBody poi={poi} />
      </div>
      <div style={{ display: "flex", padding: "14px 18px", borderTop: `1px solid ${theme.color.borderSubtle}`, flex: "none" }}>
        <DetailControls layout="footer" onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}
