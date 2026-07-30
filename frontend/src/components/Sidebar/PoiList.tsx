import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Category, Poi } from "../../types/api";
import { theme } from "../../theme";
import { useMediaQuery } from "../../lib/useMediaQuery";
import PoiCard from "./PoiCard";

/** Estimated row height (card + gap) used to seed the virtualizer before rows
 * are actually measured. Cards have a slightly variable height (rating badge,
 * visited badge, city/flag line), so the real size is measured per-row via
 * `measureElement` once rendered. */
const ESTIMATED_ROW_HEIGHT = 150;

export default function PoiList({
  pois,
  categoriesById,
  selectedId,
  onSelect,
  isLoading,
  isError,
  onRetry,
  myVisitedPoiIds,
}: {
  pois: Poi[];
  categoriesById: Record<number, Category>;
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  myVisitedPoiIds: Set<number>;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  // 3 columns only on very wide screens; 2 otherwise.
  const wide = useMediaQuery("(min-width: 1600px)");
  const cols = wide ? 3 : 2;
  const rowCount = Math.ceil(pois.length / cols);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 6,
  });

  // Reveal the selected card's row, but only when the selection actually
  // changes — not on every re-sort/filter that gives `pois` a new identity
  // (e.g. distance-sort re-sorting on every map pan), which would otherwise
  // snap the selected card back into view.
  const prevSelectedRef = useRef<number | null>(null);
  useEffect(() => {
    if (selectedId != null && selectedId !== prevSelectedRef.current) {
      const idx = pois.findIndex((p) => p.id === selectedId);
      if (idx >= 0) rowVirtualizer.scrollToIndex(Math.floor(idx / cols), { align: "auto" });
    }
    prevSelectedRef.current = selectedId;
  }, [selectedId, cols, pois, rowVirtualizer]);

  if (isLoading) {
    return (
      <div className="poi-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, gridAutoRows: "min-content", alignContent: "start" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 130, borderRadius: theme.radius.card, background: theme.color.surface1 }} />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <p style={{ color: theme.color.textSecondary, margin: 0 }}>Couldn't load places.</p>
        <button type="button" onClick={onRetry} style={{ ...ghostRetry }}>Retry</button>
      </div>
    );
  }
  if (pois.length === 0) {
    return (
      <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center" }}>
        <p style={{ fontWeight: 700, color: theme.color.textPrimary, margin: 0 }}>No places yet</p>
        <p style={{ color: theme.color.textPlaceholder, margin: 0, fontSize: 13 }}>Add your first place with the "+ Add place" button on the map.</p>
      </div>
    );
  }
  return (
    <div ref={parentRef} className="poi-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12 }}>
      <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
        {rowVirtualizer.getVirtualItems().map((vr) => {
          const start = vr.index * cols;
          const rowPois = pois.slice(start, start + cols);
          return (
            <div
              key={vr.key}
              data-index={vr.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vr.start}px)`,
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: 10,
                paddingBottom: 10,
              }}
            >
              {rowPois.map((p) => (
                <PoiCard key={p.id} poi={p} category={p.category_id != null ? categoriesById[p.category_id] : undefined} selected={p.id === selectedId} onSelect={onSelect} visited={myVisitedPoiIds.has(p.id)} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ghostRetry = {
  background: theme.color.surface0,
  color: theme.color.textBody,
  border: `1px solid ${theme.color.borderStd}`,
  borderRadius: theme.radius.input,
  padding: "8px 16px",
  fontFamily: theme.font.ui,
  fontWeight: 700,
  cursor: "pointer",
} as const;
