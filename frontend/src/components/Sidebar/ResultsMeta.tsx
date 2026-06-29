import { theme } from "../../theme";
import type { MapViewMode } from "../../lib/mapViewPref";
import type { SortMode } from "../../lib/sortPref";

const MODES: { mode: MapViewMode; label: string }[] = [
  { mode: "fit", label: "Fit" },
  { mode: "center", label: "Center" },
];

const SORTS: { mode: SortMode; label: string }[] = [
  { mode: "recent", label: "Recently added" },
  { mode: "name", label: "Name (A–Z)" },
  { mode: "rating", label: "Top rated" },
  { mode: "distance", label: "Nearest" },
];

export default function ResultsMeta({
  count,
  viewMode,
  onViewModeChange,
  sortMode,
  onSortChange,
}: {
  count: number;
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", padding: "4px 20px 10px", borderBottom: `1px solid ${theme.color.borderSubtle}` }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: theme.color.textPrimary }}>{count} {count === 1 ? "place" : "places"} shown</span>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <select
          aria-label="Sort places"
          value={sortMode}
          onChange={(e) => onSortChange(e.target.value as SortMode)}
          style={{
            border: `1px solid ${theme.color.borderStd}`,
            borderRadius: theme.radius.pill,
            background: theme.color.surface0,
            color: theme.color.textMuted,
            fontFamily: theme.font.ui,
            fontSize: 11.5,
            fontWeight: 700,
            padding: "4px 8px",
            cursor: "pointer",
          }}
        >
          {SORTS.map(({ mode, label }) => (
            <option key={mode} value={mode}>{label}</option>
          ))}
        </select>
        <span role="group" aria-label="Map view" style={{ display: "inline-flex", borderRadius: theme.radius.pill, border: `1px solid ${theme.color.borderStd}`, overflow: "hidden" }}>
          {MODES.map(({ mode, label }) => {
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
