import { Navigation } from "lucide-react";
import { theme } from "../../theme";
import { formatTravel } from "../../lib/formatTravel";
import { useIsMobile } from "../../lib/useMediaQuery";

// Day-card header: a click-to-fold bar (the whole bar is the toggle, for a big
// hit area). Left: chevron + a prominent day label with a quiet "Day N" marker;
// the stop count shows only when collapsed. Right: the day's driving total plus
// a Navigate button. The label mutes for past days.
export default function DayHeader({ label, dayNumber, distance_m, duration_s, collapsed, muted, stopCount, onToggle, onNavigate }: {
  label: string;
  dayNumber: number;
  distance_m: number;
  duration_s: number;
  collapsed: boolean;
  muted: boolean;
  stopCount: number;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const isMobile = useIsMobile();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        style={{ display: "flex", alignItems: "baseline", gap: 8, flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
      >
        <span aria-hidden style={{ fontSize: 9, color: theme.color.textPlaceholder }}>{collapsed ? "▸" : "▾"}</span>
        <span style={{ fontFamily: theme.font.ui, fontSize: 13, fontWeight: 800, letterSpacing: ".02em", color: muted ? theme.color.textPlaceholder : theme.color.textPrimary }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: theme.color.textPlaceholder }}>Day {dayNumber}</span>
        {collapsed && <span style={{ fontSize: 11, fontWeight: 700, color: theme.color.textCoord }}>· {stopCount} stops</span>}
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
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
          style={{ color: theme.color.link, background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: isMobile ? 44 : undefined, minHeight: isMobile ? 44 : undefined }}
        >
          <Navigation size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
