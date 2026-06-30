import { Eye, ArrowUpDown } from "lucide-react";
import { theme } from "../../theme";
import type { MapViewMode } from "../../lib/mapViewPref";
import type { SortMode } from "../../lib/sortPref";
import type { VisitedFilter } from "../../types/api";

const VIEW_MODES: { mode: MapViewMode; label: string }[] = [
  { mode: "fit", label: "Fit" },
  { mode: "center", label: "Center" },
];

const SORTS: { mode: SortMode; label: string }[] = [
  { mode: "recent", label: "Recently added" },
  { mode: "name", label: "Name (A–Z)" },
  { mode: "rating", label: "Top rated" },
  { mode: "distance", label: "Nearest" },
];

const VISITED: { value: VisitedFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "visited", label: "Visited" },
  { value: "not", label: "Not visited" },
];

const selectStyle = {
  border: "none",
  background: "transparent",
  color: theme.color.textMuted,
  fontFamily: theme.font.ui,
  fontSize: 11.5,
  fontWeight: 700,
  cursor: "pointer",
  outline: "none",
} as const;

const wrapStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  border: `1px solid ${theme.color.borderSubtle}`,
  borderRadius: theme.radius.pill,
  background: theme.color.surface0,
  padding: "3px 8px",
} as const;

/** Compact toolbar: result count + visited filter + sort + map view, in one row. */
export default function ListToolbar({
  count,
  visited,
  onVisitedChange,
  sortMode,
  onSortChange,
  viewMode,
  onViewModeChange,
  mobile = false,
}: {
  count: number;
  visited: VisitedFilter;
  onVisitedChange: (v: VisitedFilter) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
  /** Mobile: count sits on its own line; the three controls stay on one row. */
  mobile?: boolean;
}) {
  // On mobile the three controls must share one row, so tighten gaps/padding and
  // let the group scroll horizontally rather than wrap on very narrow screens.
  const wrap = mobile ? { ...wrapStyle, padding: "2px 7px" } : wrapStyle;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", padding: mobile ? "8px 16px" : "8px 20px", borderBottom: `1px solid ${theme.color.borderSubtle}` }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: theme.color.textPrimary, whiteSpace: "nowrap" }}>
        {count} {count === 1 ? "place" : "places"}
      </span>
      <div style={{ display: "inline-flex", alignItems: "center", gap: mobile ? 6 : 8, flexWrap: mobile ? "nowrap" : "wrap", maxWidth: "100%", overflowX: mobile ? "auto" : undefined }}>
        <span style={wrap}>
          <Eye size={13} color={theme.color.textMuted} aria-hidden />
          <select
            aria-label="Filter by visited"
            value={visited}
            onChange={(e) => onVisitedChange(e.target.value as VisitedFilter)}
            style={selectStyle}
          >
            {VISITED.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </span>
        <span style={wrap}>
          <ArrowUpDown size={13} color={theme.color.textMuted} aria-hidden />
          <select
            aria-label="Sort places"
            value={sortMode}
            onChange={(e) => onSortChange(e.target.value as SortMode)}
            style={selectStyle}
          >
            {SORTS.map(({ mode, label }) => (
              <option key={mode} value={mode}>{label}</option>
            ))}
          </select>
        </span>
        <span role="group" aria-label="Map view" style={{ display: "inline-flex", borderRadius: theme.radius.pill, border: `1px solid ${theme.color.borderSubtle}`, overflow: "hidden" }}>
          {VIEW_MODES.map(({ mode, label }) => {
            const active = viewMode === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                onClick={() => onViewModeChange(mode)}
                style={{ border: "none", cursor: "pointer", fontFamily: theme.font.ui, fontSize: 11.5, fontWeight: 700, padding: "4px 11px", background: active ? theme.color.primary : "transparent", color: active ? "#fff" : theme.color.textMuted }}
              >
                {label}
              </button>
            );
          })}
        </span>
      </div>
    </div>
  );
}
