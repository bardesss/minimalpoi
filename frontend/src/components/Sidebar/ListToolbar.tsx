import { theme } from "../../theme";
import type { MapViewMode } from "../../lib/mapViewPref";
import type { SortMode } from "../../lib/sortPref";
import type { VisitedFilter } from "../../types/api";
import FilterControls from "./FilterControls";

/**
 * Desktop control bar under the category chips: the filters shown inline (there's
 * room) with the place-count right-aligned. The mobile sheet doesn't render this —
 * it tucks the filters beside the search box and keeps the count in the sheet handle.
 */
export default function ListToolbar({
  visited,
  onVisitedChange,
  sortMode,
  onSortChange,
  viewMode,
  onViewModeChange,
  count,
}: {
  visited: VisitedFilter;
  onVisitedChange: (v: VisitedFilter) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
  count?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", padding: "8px 20px", borderBottom: `1px solid ${theme.color.borderSubtle}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
        <FilterControls
          visited={visited}
          onVisitedChange={onVisitedChange}
          sortMode={sortMode}
          onSortChange={onSortChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      </div>
      {count != null && (
        <span style={{ fontSize: 12, fontWeight: 700, color: theme.color.textPrimary, whiteSpace: "nowrap" }}>
          {count} {count === 1 ? "place" : "places"}
        </span>
      )}
    </div>
  );
}
