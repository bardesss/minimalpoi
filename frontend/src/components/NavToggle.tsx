import type { CSSProperties } from "react";
import { NavLink } from "react-router-dom";
import { theme } from "../theme";

const seg = (active: boolean): CSSProperties => ({
  flex: 1,
  textAlign: "center",
  padding: "7px 12px",
  borderRadius: theme.radius.icon,
  fontFamily: theme.font.ui,
  fontWeight: 700,
  fontSize: 13,
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
        margin: "10px 16px 4px",
        padding: 4,
        background: theme.color.surface0,
        border: `1px solid ${theme.color.borderCard}`,
        borderRadius: theme.radius.card,
      }}
    >
      <NavLink to="/" end style={seg(active === "map")}>Map</NavLink>
      <NavLink to="/routes" style={seg(active === "routes")}>Routes</NavLink>
    </nav>
  );
}
