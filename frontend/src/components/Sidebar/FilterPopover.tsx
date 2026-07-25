import { useState, type KeyboardEvent } from "react";
import { Eye, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { ghostButtonStyle, theme } from "../../theme";
import { useIsMobile } from "../../lib/useMediaQuery";
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

/** Icon-button that collapses the visited / sort / map-view controls behind a popover. */
export default function FilterPopover({
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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const active = visited !== "any";
  // On mobile the pill still needs a ≥44px tap target height, held via
  // minHeight rather than vertical padding (mirrors ListToolbar's approach).
  const wrap = mobile ? { ...wrapStyle, padding: "2px 7px", minHeight: 44 } : wrapStyle;

  function onPanelKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="hover-btn"
        aria-label="Filters"
        aria-haspopup="true"
        aria-expanded={open}
        data-active={active}
        onClick={() => setOpen((o) => !o)}
        style={{ ...ghostButtonStyle, position: "relative", padding: "6px 10px", minHeight: isMobile ? 44 : undefined, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        <SlidersHorizontal size={isMobile ? 18 : 15} />
        {active && (
          <span
            aria-hidden
            style={{ position: "absolute", top: 2, right: 2, width: 7, height: 7, borderRadius: "50%", background: theme.color.primary }}
          />
        )}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
          <div
            onKeyDown={onPanelKeyDown}
            style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 11, background: "#fff", border: `1px solid ${theme.color.borderCard}`, borderRadius: theme.radius.input, boxShadow: theme.shadow.modal, padding: 10, display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}
          >
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
                    style={{ border: "none", cursor: "pointer", fontFamily: theme.font.ui, fontSize: 11.5, fontWeight: 700, padding: "4px 11px", background: viewActive ? theme.color.primary : "transparent", color: viewActive ? "#fff" : theme.color.textMuted }}
                  >
                    {label}
                  </button>
                );
              })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
