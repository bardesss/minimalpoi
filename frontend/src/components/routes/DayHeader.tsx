import { Navigation } from "lucide-react";
import { theme } from "../../theme";
import { formatTravel } from "../../lib/formatTravel";

const caption = {
  fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em",
  color: theme.color.textPlaceholder,
} as const;

// Quiet day divider: a click-to-fold caption on the left, the day's driving
// total plus a Navigate button on the right. Reuses existing tokens only — no
// new visual vocabulary. The first header omits the top rule.
export default function DayHeader({ label, distance_m, duration_s, isFirst, collapsed, stopCount, onToggle, onNavigate }: {
  label: string;
  distance_m: number;
  duration_s: number;
  isFirst: boolean;
  collapsed: boolean;
  stopCount: number;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  return (
    <div
      style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8,
        margin: isFirst ? "0 0 8px" : "16px 0 8px",
        paddingTop: isFirst ? 0 : 12,
        borderTop: isFirst ? "none" : `1px solid ${theme.color.borderStd}`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        style={{ ...caption, display: "flex", alignItems: "baseline", gap: 6, background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        <span aria-hidden style={{ fontSize: 9 }}>{collapsed ? "▸" : "▾"}</span>
        <span>{label}</span>
        {collapsed && <span style={{ color: theme.color.textCoord, fontWeight: 700 }}>· {stopCount} stops</span>}
      </button>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        {distance_m > 0 && (
          <span style={{ fontFamily: theme.font.mono, fontSize: 11, color: theme.color.textCoord }}>
            {formatTravel(distance_m, duration_s)}
          </span>
        )}
        <button
          type="button"
          onClick={onNavigate}
          aria-label={`Navigate ${label}`}
          title="Navigate"
          style={{ color: theme.color.link, background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
        >
          <Navigation size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
