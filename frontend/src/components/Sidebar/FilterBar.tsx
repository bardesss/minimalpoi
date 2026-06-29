import type { VisitedFilter } from "../../types/api";
import { theme } from "../../theme";

const OPTIONS: { value: VisitedFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "visited", label: "Visited" },
  { value: "not", label: "Not visited" },
];

/** Segmented control to filter the list/map by whether the current user has visited a place. */
export default function FilterBar({
  value,
  onChange,
}: {
  value: VisitedFilter;
  onChange: (v: VisitedFilter) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 20px 4px" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: theme.color.textPlaceholder, textTransform: "uppercase", letterSpacing: 0.4 }}>
        Visited
      </span>
      <div style={{ display: "inline-flex", border: `1px solid ${theme.color.borderStd}`, borderRadius: theme.radius.pill, overflow: "hidden" }}>
        {OPTIONS.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              style={{
                padding: "5px 11px",
                border: "none",
                background: active ? theme.color.primary : "#fff",
                color: active ? "#fff" : theme.color.textMuted,
                fontFamily: theme.font.ui,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all .12s",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
