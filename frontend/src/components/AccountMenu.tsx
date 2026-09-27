import { theme } from "../theme";
import MenuButton from "./MenuButton";

const roleBadge: Record<string, { bg: string; fg: string }> = {
  admin: { bg: "#eef0fe", fg: "#4f46e5" },
  member: { bg: "#f0eeec", fg: "#6b655d" },
};

/** Avatar button opening the account menu: who you are, Settings, Log out.
 * Replaces the always-visible account footer so the list gets that space. */
export default function AccountMenu({ username, role, onLogout, onOpenSettings, updateAvailable }: { username: string; role: string; onLogout: () => void; onOpenSettings: () => void; updateAvailable: boolean }) {
  const badge = roleBadge[role] ?? roleBadge.member;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  return (
    <MenuButton
      ariaLabel={updateAvailable ? `Account (${username}), update available` : `Account (${username})`}
      menuLabel={`Account: ${username}, ${roleLabel}`}
      triggerStyle={{ position: "relative", width: 36, height: 36, padding: 0, borderRadius: "50%", border: "none", background: theme.gradient.brand, color: "#fff", fontFamily: theme.font.ui, fontWeight: 800, fontSize: 13, cursor: "pointer", flex: "none" }}
      label={
        <>
          {username.slice(0, 1).toUpperCase()}
          {updateAvailable && (
            <span aria-hidden style={{ position: "absolute", top: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: theme.color.primary, border: "2px solid #fff" }} />
          )}
        </>
      }
      heading={
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: theme.color.textPrimary }}>{username}</div>
          <span style={{ display: "inline-block", marginTop: 3, padding: "2px 9px", borderRadius: theme.radius.pill, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.fg }}>{roleLabel}</span>
        </div>
      }
      items={[
        { key: "settings", label: updateAvailable ? "Settings · update available" : "Settings", onSelect: onOpenSettings },
        { key: "logout", label: "Log out", onSelect: onLogout },
      ]}
    />
  );
}
