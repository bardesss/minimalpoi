import type { CSSProperties, ReactNode } from "react";
import type { RouteNode } from "../../types/api";
import { theme } from "../../theme";
import { useIsMobile, useIsCoarsePointer } from "../../lib/useMediaQuery";
import { useDeleteNode, useUpdateNode } from "../../queries/hooks";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Bookmark } from "lucide-react";

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

// One stop or multi-night stay. Dragging happens via the grip handle only
// (never the whole row, to avoid nesting an interactive role inside the row's
// own action buttons) unless `pinned` (start/end places, which never
// reorder). Stays (★) show arrive→depart dates and a nights stepper; stops
// (·) just show their name.
export default function RouteNodeRow({
  node,
  routeId,
  canEdit,
  pinned = false,
  seq,
  children,
  onHover,
}: {
  node: RouteNode;
  routeId: number;
  canEdit: boolean;
  pinned?: boolean;
  seq?: number;
  children?: ReactNode;
  onHover?: (id: number | null) => void;
}) {
  const updateNode = useUpdateNode(routeId);
  const deleteNode = useDeleteNode(routeId);
  const isMobile = useIsMobile();
  const isCoarse = useIsCoarsePointer();
  const bigGrip = isMobile || isCoarse;
  // Same signal as the grip: a touch-desktop/iPad (coarse pointer, not
  // necessarily narrow viewport) gets big icon buttons too, for consistency.
  const iconBtn = iconBtnStyle(bigGrip ? 40 : 24);
  const isStay = node.kind === "stay";
  const draggable = canEdit && !pinned;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id, disabled: !draggable });
  const sortableStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  function setNights(next: number) {
    updateNode.mutate({ nodeId: node.id, body: { nights: Math.max(0, next) } });
  }

  const dragHandleProps = draggable
    ? { ...attributes, ...listeners, "aria-label": `Reorder ${node.name}`, role: "button" as const }
    : {};

  // The grip is the sole drag target, on desktop as well as mobile — dragging
  // by the whole row would nest an interactive role inside the row's own
  // action buttons (an a11y anti-pattern). Mobile additionally relies on this
  // being handle-only so a finger can scroll the sheet by touching the row
  // body without accidentally reordering it (the "fat finger" fix). Keyboard
  // reorder still works because dnd-kit's KeyboardSensor operates on whichever
  // element is focused, i.e. the grip.
  const handleDrag = draggable ? dragHandleProps : {};

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => onHover?.(node.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(node.id)}
      onBlur={() => onHover?.(null)}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "8px 0",
        ...sortableStyle,
      }}
    >
      {draggable && (
        <span
          {...handleDrag}
          style={{
            flex: "none",
            width: bigGrip ? 40 : 26,
            height: bigGrip ? 40 : 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme.color.textMuted,
            cursor: "grab",
            touchAction: "none",
          }}
        >
          <GripVertical size={bigGrip ? 20 : 16} />
        </span>
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
          fontSize: 13,
          fontFamily: theme.font.ui,
          fontWeight: 700,
          background: isStay ? theme.color.tintBg : theme.color.surface1,
          color: isStay ? theme.color.deepIndigoText : theme.color.textMuted,
        }}
      >
        {node.role === "start" ? "▶" : node.role === "end" ? "■" : seq != null ? seq : isStay ? "★" : "·"}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: theme.font.ui, fontWeight: 700, fontSize: 14, color: theme.color.textPrimary }}>{node.name}</span>
          {node.poi_id != null && (
            <span aria-label="Saved place" title="Saved place" style={{ flex: "none", display: "inline-flex", color: theme.color.textMuted }}>
              <Bookmark size={13} />
            </span>
          )}
          {canEdit && (
            <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
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
