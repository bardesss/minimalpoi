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

/** Compact icon toggle between the Map and Routes sections. Icon-only to stay
 *  small enough to sit in the sidebar header row; the accessible name comes
 *  from aria-label (also surfaced as a hover tooltip via title). */
export default function NavToggle({ active }: { active: "map" | "routes" }) {
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
      <NavLink to="/" end aria-label="Map" title="Map" style={seg(active === "map")}>
        <MapPin size={16} aria-hidden />
      </NavLink>
      <NavLink to="/routes" aria-label="Routes" title="Routes" style={seg(active === "routes")}>
        <Route size={16} aria-hidden />
      </NavLink>
    </nav>
  );
}
