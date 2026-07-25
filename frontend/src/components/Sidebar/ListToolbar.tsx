import { theme } from "../../theme";
import type { MapViewMode } from "../../lib/mapViewPref";
import type { SortMode } from "../../lib/sortPref";
import type { VisitedFilter } from "../../types/api";
import FilterControls from "./FilterControls";
import FilterPopover from "./FilterPopover";

/**
 * The control bar under the category chips. Desktop shows the filters inline
 * (there's room) with the place-count right-aligned; the cramped mobile sheet
 * collapses them behind the FilterPopover trigger instead (count lives in the
 * sheet handle there).
 */
export default function ListToolbar({
  visited,
  onVisitedChange,
  sortMode,
  onSortChange,
  viewMode,
  onViewModeChange,
  count,
  mobile = false,
}: {
  visited: VisitedFilter;
  onVisitedChange: (v: VisitedFilter) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
  /** Desktop: shown right-aligned in the bar. Mobile: omit (count is in the sheet handle). */
  count?: number;
  mobile?: boolean;
}) {
  const rowBase = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderBottom: `1px solid ${theme.color.borderSubtle}`,
  } as const;

  if (mobile) {
    return (
      <div style={{ ...rowBase, justifyContent: "flex-end", padding: "8px 16px" }}>
        <FilterPopover
          visited={visited}
          onVisitedChange={onVisitedChange}
          sortMode={sortMode}
          onSortChange={onSortChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          mobile
        />
      </div>
    );
  }

  return (
    <div style={{ ...rowBase, justifyContent: "space-between", flexWrap: "wrap", padding: "8px 20px" }}>
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
