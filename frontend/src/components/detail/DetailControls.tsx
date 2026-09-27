import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { dangerButtonStyle, ghostButtonStyle, primaryButtonStyle, theme } from "../../theme";
import MenuButton from "../MenuButton";

/**
 * Edit + a "⋯" menu holding Delete, with an inline confirmation. `footer` is
 * the sticky bar of the desktop panel/sidebar; `header` is the compact row at
 * the top of the mobile sheet (with the close button passed as `trailing`).
 * Containers key this by place id so an armed confirmation never carries over
 * to another place.
 */
export default function DetailControls({ onEdit, onDelete, layout, trailing }: { onEdit: () => void; onDelete: () => void; layout: "footer" | "header"; trailing?: ReactNode }) {
  const [confirming, setConfirming] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  // Set when the confirmation is dismissed, so focus goes back to the ⋯ trigger
  // (which re-mounts) instead of falling to <body>.
  const returnFocusRef = useRef(false);
  const compact = layout === "header";
  // 44px minimum in both layouts: coarse-pointer tablets use the footer layout.
  const small = { padding: compact ? "8px 12px" : undefined, minHeight: 44 };

  useEffect(() => {
    if (confirming) {
      cancelRef.current?.focus();
    } else if (returnFocusRef.current) {
      returnFocusRef.current = false;
      rootRef.current?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')?.focus();
    }
  }, [confirming]);

  function cancel() {
    returnFocusRef.current = true;
    setConfirming(false);
  }

  function onConfirmKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      // Escape backs out of the confirmation only; the enclosing detail's
      // dialog handler skips this group (data-dialog-escape="ignore").
      e.stopPropagation();
      cancel();
    }
  }

  if (confirming) {
    return (
      <div role="group" aria-label="Confirm delete" data-dialog-escape="ignore" onKeyDown={onConfirmKeyDown} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: theme.color.dangerText }}>Delete this place?</span>
        <button ref={cancelRef} type="button" onClick={cancel} style={{ ...ghostButtonStyle, ...small }}>Cancel</button>
        <button type="button" onClick={onDelete} style={{ ...dangerButtonStyle, ...small }}>Delete</button>
      </div>
    );
  }

  return (
    <div ref={rootRef} style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 9, flex: compact ? undefined : 1 }}>
      <button type="button" aria-label="Edit place" onClick={onEdit} style={compact ? { ...ghostButtonStyle, ...small } : { ...primaryButtonStyle, flex: 1, minHeight: 44 }}>
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
