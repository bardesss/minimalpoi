import type { CSSProperties } from "react";
import { NavLink } from "react-router-dom";
import { MapPin, Route } from "lucide-react";
import { theme } from "../theme";

type Variant = "icon" | "labeled";

const seg = (active: boolean, variant: Variant): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: variant === "labeled" ? 6 : 0,
  ...(variant === "labeled"
    ? { padding: "7px 12px", minHeight: 38, fontFamily: theme.font.ui, fontWeight: 700, fontSize: 13, textDecoration: "none" }
    : { width: 34, height: 30 }),
  borderRadius: theme.radius.icon,
  color: active ? "#fff" : theme.color.textSecondary,
  background: active ? theme.color.primary : "transparent",
});

/**
 * Toggle between the Map and Routes sections.
 * - `icon` (desktop): icon-only, small enough to sit in the sidebar header row.
 * - `labeled` (mobile): icon + text, so the control reads clearly on a phone.
 * The accessible name comes from aria-label either way (also a hover tooltip).
 */
export default function NavToggle({ active, variant = "icon" }: { active: "map" | "routes"; variant?: Variant }) {
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
      <NavLink to="/" end aria-label="Map" title="Map" style={seg(active === "map", variant)}>
        <MapPin size={16} aria-hidden />
        {variant === "labeled" && "Map"}
      </NavLink>
      <NavLink to="/routes" aria-label="Routes" title="Routes" style={seg(active === "routes", variant)}>
        <Route size={16} aria-hidden />
        {variant === "labeled" && "Routes"}
      </NavLink>
    </nav>
  );
}
