import type { CSSProperties } from "react";
import { NavLink } from "react-router-dom";
import { MapPin, Route } from "lucide-react";
import { theme } from "../theme";

const seg = (active: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 30,
  borderRadius: theme.radius.icon,
  color: active ? "#fff" : theme.color.textSecondary,
  background: active ? theme.color.primary : "transparent",
});

/**
 * Toggle between the Map and Routes sections: icon-only, compact enough for
 * the desktop sidebar header and the mobile sheet's 44px handle row (beside
 * the centred grip). The accessible name comes from aria-label (also a hover
 * tooltip).
 *
 * The active segment comes from NavLink's own `isActive` (which already emits
 * aria-current), rather than a prop drilled down from the page — one source of
 * truth, so the highlight and aria-current cannot desync.
 */
export default function NavToggle() {
  return (
    <nav
      aria-label="Sections"
      style={{
        display: "inline-flex",
        gap: 3,
        padding: 3,
        background: theme.color.surface0,
        border: `1px solid ${theme.color.borderCard}`,
        borderRadius: theme.radius.icon,
      }}
    >
      <NavLink to="/" end aria-label="Map" title="Map" style={({ isActive }) => seg(isActive)}>
        <MapPin size={16} aria-hidden />
      </NavLink>
      <NavLink to="/routes" aria-label="Routes" title="Routes" style={({ isActive }) => seg(isActive)}>
        <Route size={16} aria-hidden />
      </NavLink>
    </nav>
  );
}
