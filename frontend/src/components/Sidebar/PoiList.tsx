// frontend/src/components/Sidebar/PoiList.tsx
import type { Category, Poi } from "../../types/api";
import { theme } from "../../theme";
import PoiCard from "./PoiCard";

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
    <div className="poi-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, gridAutoRows: "min-content", alignContent: "start" }}>
      {pois.map((p) => (
        <PoiCard key={p.id} poi={p} category={p.category_id != null ? categoriesById[p.category_id] : undefined} selected={p.id === selectedId} onSelect={onSelect} visited={myVisitedPoiIds.has(p.id)} />
      ))}
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
