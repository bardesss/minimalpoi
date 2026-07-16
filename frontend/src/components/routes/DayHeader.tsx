import { theme } from "../../theme";
import { formatTravel } from "../../lib/formatTravel";

// Quiet day divider: the date in the app's section-caption style on the left,
// the day's driving total (mono, muted) on the right. Reuses existing tokens
// only — no new visual vocabulary. The first header omits the top rule.
export default function DayHeader({ label, distance_m, duration_s, isFirst }: {
  label: string;
  distance_m: number;
  duration_s: number;
  isFirst: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 8,
        margin: isFirst ? "0 0 8px" : "16px 0 8px",
        paddingTop: isFirst ? 0 : 12,
        borderTop: isFirst ? "none" : `1px solid ${theme.color.borderStd}`,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder }}>
        {label}
      </span>
      {distance_m > 0 && (
        <span style={{ fontFamily: theme.font.mono, fontSize: 11, color: theme.color.textCoord }}>
          {formatTravel(distance_m, duration_s)}
        </span>
      )}
    </div>
  );
}
