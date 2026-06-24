// frontend/src/components/Sidebar/SidebarHeader.tsx
import { theme } from "../../theme";

export default function SidebarHeader({ onCollapse }: { onCollapse: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 16px", background: theme.gradient.asideHeader }}>
      <div style={{ width: 32, height: 32, borderRadius: theme.radius.logo, background: theme.gradient.brand, boxShadow: "0 3px 10px rgba(79,70,229,.4)" }} />
      <div style={{ flex: 1, lineHeight: 1.1 }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>MinimalPOI</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: theme.color.textPlaceholder, letterSpacing: ".01em" }}>POI Manager</div>
      </div>
      <button type="button" aria-label="Collapse panel" onClick={onCollapse} style={{ width: 30, height: 30, borderRadius: theme.radius.icon, background: "#fff", border: `1px solid ${theme.color.borderStd}`, color: theme.color.textSecondary, cursor: "pointer" }}>«</button>
    </div>
  );
}
