import { useState, type ReactNode } from "react";
import { dangerButtonStyle, ghostButtonStyle, primaryButtonStyle, theme } from "../../theme";
import MenuButton from "../MenuButton";

/**
 * Edit + a "⋯" menu holding Delete, with an inline confirmation. `footer` is
 * the sticky bar of the desktop panel/sidebar; `header` is the compact row at
 * the top of the mobile sheet (with the close button passed as `trailing`).
 */
export default function DetailControls({ onEdit, onDelete, layout, trailing }: { onEdit: () => void; onDelete: () => void; layout: "footer" | "header"; trailing?: ReactNode }) {
  const [confirming, setConfirming] = useState(false);
  const compact = layout === "header";
  const small = { padding: compact ? "8px 12px" : undefined, minHeight: compact ? 44 : undefined };

  if (confirming) {
    return (
      <div role="group" aria-label="Confirm delete" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: theme.color.dangerText }}>Delete this place?</span>
        <button type="button" onClick={() => setConfirming(false)} style={{ ...ghostButtonStyle, ...small }}>Cancel</button>
        <button type="button" onClick={onDelete} style={{ ...dangerButtonStyle, ...small }}>Delete</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 9, flex: compact ? undefined : 1 }}>
      <button type="button" aria-label="Edit place" onClick={onEdit} style={compact ? { ...ghostButtonStyle, ...small } : { ...primaryButtonStyle, flex: 1 }}>
        {compact ? "Edit" : "Edit place"}
      </button>
      <MenuButton
        label="⋯"
        ariaLabel="More actions"
        menuLabel="Place actions"
        placement={compact ? "below" : "above"}
        triggerStyle={{ ...ghostButtonStyle, padding: "0 14px", minHeight: 44, fontSize: 18, lineHeight: 1 }}
        items={[{ key: "delete", label: "Delete place", danger: true, onSelect: () => setConfirming(true) }]}
      />
      {trailing}
    </div>
  );
}
