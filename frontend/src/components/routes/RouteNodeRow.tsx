import type { CSSProperties, ReactNode } from "react";
import type { RouteNode } from "../../types/api";
import { theme } from "../../theme";
import { useIsMobile } from "../../lib/useMediaQuery";
import { useDeleteNode, useUpdateNode } from "../../queries/hooks";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

// Comfortable tap targets on touch (~40px), compact on the desktop panel.
function iconBtnStyle(size: number): CSSProperties {
  return {
    border: `1px solid ${theme.color.borderStd}`,
    background: theme.color.surface0,
    color: theme.color.textBody,
    borderRadius: theme.radius.icon,
    width: size,
    height: size,
    fontFamily: theme.font.ui,
    fontWeight: 700,
    fontSize: size >= 36 ? 16 : 13,
    cursor: "pointer",
    lineHeight: 1,
  };
}

// One stop or multi-night stay in the timeline. Stays (★) show their arrive→
// depart dates and a nights stepper; stops (·) just show their name. Reorder
// via move up/down (the parent computes the new fractional position).
export default function RouteNodeRow({
  node,
  routeId,
  canEdit,
  isFirst,
  isLast,
  onMove,
  children,
}: {
  node: RouteNode;
  routeId: number;
  canEdit: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (dir: -1 | 1) => void;
  children?: ReactNode;
}) {
  const updateNode = useUpdateNode(routeId);
  const deleteNode = useDeleteNode(routeId);
  const isMobile = useIsMobile();
  const iconBtn = iconBtnStyle(isMobile ? 40 : 24);
  const isStay = node.kind === "stay";

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id, disabled: !canEdit });
  const sortableStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  function setNights(next: number) {
    updateNode.mutate({ nodeId: node.id, body: { nights: Math.max(0, next) } });
  }

  return (
    <div ref={setNodeRef} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", ...sortableStyle }}>
      {canEdit && (
        <button
          type="button"
          aria-label={`Reorder ${node.name}`}
          {...attributes}
          {...listeners}
          style={{ flex: "none", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", color: theme.color.textMuted, cursor: "grab", touchAction: "none" }}
        >
          <GripVertical size={16} />
        </button>
      )}
      <span
        aria-hidden
        style={{
          flex: "none",
          width: 26,
          height: 26,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isStay ? 13 : 16,
          background: isStay ? theme.color.tintBg : theme.color.surface1,
          color: isStay ? theme.color.deepIndigoText : theme.color.textMuted,
        }}
      >
        {isStay ? "★" : "·"}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: theme.font.ui, fontWeight: 700, fontSize: 14, color: theme.color.textPrimary }}>{node.name}</span>
          {canEdit && (
            <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              <button type="button" aria-label="Move up" style={iconBtn} disabled={isFirst} onClick={() => onMove(-1)}>↑</button>
              <button type="button" aria-label="Move down" style={iconBtn} disabled={isLast} onClick={() => onMove(1)}>↓</button>
              <button
                type="button"
                aria-label={`Remove ${node.name}`}
                style={{ ...iconBtn, color: theme.color.dangerText, borderColor: theme.color.dangerBorder }}
                onClick={() => deleteNode.mutate(node.id)}
              >
                ×
              </button>
            </span>
          )}
        </div>

        {isStay && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
            {node.arrive_date && node.depart_date && (
              <span style={{ fontFamily: theme.font.mono, fontSize: 11.5, color: theme.color.textCoord }}>
                {node.arrive_date} → {node.depart_date}
              </span>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.color.textSecondary }}>
              {canEdit && (
                <button type="button" aria-label="One fewer night" style={iconBtn} onClick={() => setNights((node.nights ?? 0) - 1)}>−</button>
              )}
              <span>{node.nights ?? 0} {(node.nights ?? 0) === 1 ? "night" : "nights"}</span>
              {canEdit && (
                <button type="button" aria-label="One more night" style={iconBtn} onClick={() => setNights((node.nights ?? 0) + 1)}>+</button>
              )}
            </span>
          </div>
        )}

        {node.notes && (
          <p style={{ margin: "4px 0 0", fontSize: 12.5, lineHeight: 1.5, color: theme.color.textBody }}>{node.notes}</p>
        )}

        {children}
      </div>
    </div>
  );
}
