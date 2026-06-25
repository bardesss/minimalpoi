// frontend/src/components/Sidebar/AccountFooter.tsx
import { theme } from "../../theme";

const roleBadge: Record<string, { bg: string; fg: string }> = {
  admin: { bg: "#eef0fe", fg: "#4f46e5" },
  member: { bg: "#f0eeec", fg: "#6b655d" },
};

export default function AccountFooter({ username, role, onLogout, onOpenData }: { username: string; role: string; onLogout: () => void; onOpenData: () => void }) {
  const badge = roleBadge[role] ?? roleBadge.member;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderTop: `1px solid ${theme.color.borderSubtle}`, background: "#fff" }}>
      <div style={{ width: 32, height: 32, borderRadius: theme.radius.logo, background: theme.gradient.brand, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12.5 }}>
        {username.slice(0, 1).toUpperCase()}
      </div>
      <div style={{ flex: 1, lineHeight: 1.2 }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-.01em" }}>{username}</div>
        <span style={{ display: "inline-block", marginTop: 2, padding: "2px 9px", borderRadius: theme.radius.pill, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.fg }}>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
      </div>
      <button type="button" aria-label="Data & backups" title="Data & backups" onClick={onOpenData} style={{ background: "#fff", border: `1px solid ${theme.color.borderStd}`, borderRadius: theme.radius.icon, padding: "7px 10px", fontFamily: theme.font.ui, fontWeight: 700, fontSize: 13, color: theme.color.textBody, cursor: "pointer" }}>⚙</button>
      <button type="button" onClick={onLogout} style={{ background: "#fff", border: `1px solid ${theme.color.borderStd}`, borderRadius: theme.radius.icon, padding: "7px 12px", fontFamily: theme.font.ui, fontWeight: 700, fontSize: 12, color: theme.color.textBody, cursor: "pointer" }}>Log out</button>
    </div>
  );
}
