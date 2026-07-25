import { theme } from "../../theme";
import type { MapViewMode } from "../../lib/mapViewPref";
import type { SortMode } from "../../lib/sortPref";
import type { VisitedFilter } from "../../types/api";
import FilterPopover from "./FilterPopover";

/** Compact toolbar row: just the filters trigger, right-aligned. */
export default function ListToolbar({
  visited,
  onVisitedChange,
  sortMode,
  onSortChange,
  viewMode,
  onViewModeChange,
  mobile = false,
}: {
  visited: VisitedFilter;
  onVisitedChange: (v: VisitedFilter) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
  mobile?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: mobile ? "8px 16px" : "8px 20px", borderBottom: `1px solid ${theme.color.borderSubtle}` }}>
      <FilterPopover
        visited={visited}
        onVisitedChange={onVisitedChange}
        sortMode={sortMode}
        onSortChange={onSortChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        mobile={mobile}
      />
    </div>
  );
}
