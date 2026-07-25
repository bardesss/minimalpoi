import type { CSSProperties } from "react";
import { NavLink } from "react-router-dom";
import { MapPin, Route } from "lucide-react";
import { theme } from "../theme";

const seg = (active: boolean): CSSProperties => ({
  flex: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  textAlign: "center",
  padding: "5px 10px",
  borderRadius: theme.radius.icon,
  fontFamily: theme.font.ui,
  fontWeight: 700,
  fontSize: 12.5,
  textDecoration: "none",
  color: active ? "#fff" : theme.color.textSecondary,
  background: active ? theme.color.primary : "transparent",
});

export default function NavToggle({ active }: { active: "map" | "routes" }) {
  return (
    <nav
      aria-label="Sections"
      style={{
        display: "flex",
        gap: 4,
        margin: "8px 16px 2px",
        padding: 3,
        background: theme.color.surface0,
        border: `1px solid ${theme.color.borderCard}`,
        borderRadius: theme.radius.card,
      }}
    >
      <NavLink to="/" end style={seg(active === "map")}>
        <MapPin size={14} aria-hidden />
        Map
      </NavLink>
      <NavLink to="/routes" style={seg(active === "routes")}>
        <Route size={14} aria-hidden />
        Routes
      </NavLink>
    </nav>
  );
}
