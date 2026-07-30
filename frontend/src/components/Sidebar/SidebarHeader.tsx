import type { ReactNode } from "react";
import { theme } from "../../theme";
import BrandLogo from "../BrandLogo";

export default function SidebarHeader({ onCollapse, nav }: { onCollapse: () => void; nav?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 16px", background: theme.gradient.asideHeader }}>
      <BrandLogo size={32} />
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.1 }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>MinimalPOI</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: theme.color.textPlaceholder, letterSpacing: ".01em" }}>Points of Interest Manager</div>
      </div>
      {nav}
      <button type="button" aria-label="Collapse panel" onClick={onCollapse} style={{ flex: "none", width: 30, height: 30, borderRadius: theme.radius.icon, background: "#fff", border: `1px solid ${theme.color.borderStd}`, color: theme.color.textSecondary, cursor: "pointer" }}>«</button>
    </div>
  );
}
