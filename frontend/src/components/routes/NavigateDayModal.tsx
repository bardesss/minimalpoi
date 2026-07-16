import { createPortal } from "react-dom";
import { Navigation } from "lucide-react";
import { ghostButtonStyle, theme } from "../../theme";
import { appleMapsUrl, coordsText, googleMapsDirUrl, toGpx, type Waypoint } from "../../lib/routeNav";

// Fallback picker when the OS share sheet is unavailable (desktop). Reuses the
// app's overlay + card styling. Each action fires then closes.
export default function NavigateDayModal({ dayLabel, waypoints, onClose }: {
  dayLabel: string;
  waypoints: Waypoint[];
  onClose: () => void;
}) {
  function openUrl(url: string) {
    window.open(url, "_blank", "noopener");
    onClose();
  }

  function downloadGpx() {
    const blob = new Blob([toGpx(waypoints, dayLabel)], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dayLabel.replace(/\s+/g, "-").toLowerCase()}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  }

  async function copyCoords() {
    try {
      await navigator.clipboard.writeText(coordsText(waypoints));
    } catch {
      /* clipboard unavailable — nothing to do */
    }
    onClose();
  }

  const rowStyle = { ...ghostButtonStyle, width: "100%", textAlign: "left" as const, marginBottom: 8 };

  // Portalled to <body> so `position: fixed` resolves against the viewport.
  // On mobile the timeline renders inside the bottom sheet's `transform`, which
  // would otherwise become the containing block and trap the overlay in it.
  return createPortal(
    <div
      data-testid="navmodal-backdrop"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(26,24,22,.42)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn .16s ease" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: theme.color.surface0, borderRadius: theme.radius.modal, boxShadow: theme.shadow.modal, padding: 20, width: 320, maxWidth: "92vw" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <strong style={{ fontSize: 14, color: theme.color.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
            <Navigation size={16} aria-hidden />
            {dayLabel}
          </strong>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 28, height: 28, borderRadius: theme.radius.icon, border: "none", background: theme.color.surface1, color: theme.color.textSecondary, cursor: "pointer" }}>×</button>
        </div>
        <button type="button" style={rowStyle} onClick={() => openUrl(googleMapsDirUrl(waypoints))}>Open in Google Maps</button>
        <button type="button" style={rowStyle} onClick={() => openUrl(appleMapsUrl(waypoints))}>Open in Apple Maps <span style={{ color: theme.color.textPlaceholder, fontWeight: 400 }}>· single stop</span></button>
        <button type="button" style={rowStyle} onClick={downloadGpx}>Download GPX</button>
        <button type="button" style={{ ...rowStyle, marginBottom: 0 }} onClick={copyCoords}>Copy coordinates</button>
      </div>
    </div>,
    document.body,
  );
}
