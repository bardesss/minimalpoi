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

interface FilterControlsProps {
  visited: VisitedFilter;
  onVisitedChange: (v: VisitedFilter) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
  /** Coarse pointer: enlarge the pills to a ≥44px tap target. */
  mobile?: boolean;
}

/**
 * The visited / sort / map-view controls, rendered as a fragment so the parent
 * decides flow: a horizontal row inline on the desktop toolbar, or a vertical
 * stack inside the mobile FilterPopover panel.
 */
export default function FilterControls({
  visited,
  onVisitedChange,
  sortMode,
  onSortChange,
  viewMode,
  onViewModeChange,
  mobile = false,
}: FilterControlsProps) {
  const wrap = mobile ? { ...wrapStyle, padding: "2px 7px", minHeight: 44 } : wrapStyle;
  return (
    <>
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
          const viewActive = viewMode === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={viewActive}
              onClick={() => onViewModeChange(mode)}
              style={{ border: "none", cursor: "pointer", fontFamily: theme.font.ui, fontSize: 11.5, fontWeight: 700, padding: mobile ? "9px 14px" : "4px 11px", background: viewActive ? theme.color.primary : "transparent", color: viewActive ? "#fff" : theme.color.textMuted }}
            >
              {label}
            </button>
          );
        })}
      </span>
    </>
  );
}
