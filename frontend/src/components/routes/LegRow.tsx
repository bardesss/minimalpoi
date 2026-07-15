import type { RouteLeg } from "../../types/api";
import { theme } from "../../theme";
import { formatTravel } from "../../lib/formatTravel";

// A travel segment between two consecutive nodes. Shows an "est." pill when the
// distance/time came from the haversine fallback rather than Google Directions.
export default function LegRow({ leg }: { leg: RouteLeg }) {
  const estimate = leg.source === "estimate";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0 4px 26px", color: theme.color.textSecondary, fontSize: 12 }}>
      <span aria-hidden style={{ color: theme.color.textPlaceholder }}>↓</span>
      <span style={{ fontFamily: theme.font.mono, fontSize: 11.5 }}>{formatTravel(leg.distance_m, leg.duration_s)}</span>
      {estimate && (
        <span
          style={{
            padding: "1px 7px",
            borderRadius: theme.radius.pill,
            background: theme.color.tintBg,
            color: theme.color.deepIndigoText,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".03em",
          }}
        >
          est.
        </span>
      )}
    </div>
  );
}
