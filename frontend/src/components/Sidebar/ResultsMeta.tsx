import { theme } from "../../theme";
import type { MapViewMode } from "../../lib/mapViewPref";

const MODES: { mode: MapViewMode; label: string }[] = [
  { mode: "fit", label: "Fit" },
  { mode: "center", label: "Center" },
];

export default function ResultsMeta({
  count,
  viewMode,
  onViewModeChange,
}: {
  count: number;
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 10px", borderBottom: `1px solid ${theme.color.borderSubtle}` }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: theme.color.textPrimary }}>{count} {count === 1 ? "place" : "places"} shown</span>
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
  );
}
