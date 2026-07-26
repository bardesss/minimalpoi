import { useState, type ComponentType } from "react";
import { useAuth } from "../auth/AuthContext";
import { theme } from "../theme";
import { useIsMobile } from "../lib/useMediaQuery";
import { useDialog } from "../lib/useDialog";
import { useFullSettings } from "../queries/hooks";
import AboutSection from "./settings/AboutSection";
import ApiTokensSection from "./settings/ApiTokensSection";
import CategoriesSection from "./settings/CategoriesSection";
import ConnectionsSection from "./settings/ConnectionsSection";
import DataSection from "./settings/DataSection";
import MapSection from "./settings/MapSection";
import SyncSection from "./settings/SyncSection";
import TagsSection from "./settings/TagsSection";
import TeamsSection from "./settings/TeamsSection";
import UsersSection from "./settings/UsersSection";

interface SectionDef {
  key: string;
  label: string;
  adminOnly: boolean;
  Component: ComponentType;
}

// Ordered by concern, admin-only sections grouped first: external integrations
// (Connections + its Sync), then Map/feature toggles, then Users; followed by
// the member-visible sections (Teams, content, Data, About). Keeping Sync next
// to Connections matters — they configure the same TRIP subsystem.
const SECTIONS: SectionDef[] = [
  { key: "connections", label: "Connections", adminOnly: true, Component: ConnectionsSection },
  { key: "sync", label: "Sync", adminOnly: true, Component: SyncSection },
  { key: "map", label: "Map", adminOnly: true, Component: MapSection },
  { key: "users", label: "Users", adminOnly: true, Component: UsersSection },
  { key: "teams", label: "Teams", adminOnly: false, Component: TeamsSection },
  { key: "categories", label: "Categories", adminOnly: false, Component: CategoriesSection },
  { key: "tags", label: "Tags", adminOnly: false, Component: TagsSection },
  { key: "data", label: "Data & backups", adminOnly: false, Component: DataSection },
  { key: "apitokens", label: "API access", adminOnly: false, Component: ApiTokensSection },
  { key: "about", label: "About", adminOnly: false, Component: AboutSection },
];

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { dialogRef, onBackdropClick } = useDialog<HTMLDivElement>(onClose);
  const isAdmin = user?.role === "admin";
  // Full settings only exist for admins; gate the fetch so members don't 403.
  // Sync is meaningless until a TRIP instance is wired up (a base URL is set),
  // so hide that tab until then.
  const fullSettings = useFullSettings(isAdmin);
  const tripConfigured = !!fullSettings.data?.trip_base_url;
  const visible = SECTIONS.filter(
    (s) => (!s.adminOnly || isAdmin) && (s.key !== "sync" || tripConfigured),
  );
  const [activeKey, setActiveKey] = useState(visible[0]?.key ?? "data");
  const active = visible.find((s) => s.key === activeKey) ?? visible[0];
  if (!active) return null;
  const Active = active.Component;

  return (
    <div onClick={onBackdropClick} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(26,24,22,.42)", backdropFilter: "blur(2px)", display: "flex", alignItems: isMobile ? "stretch" : "center", justifyContent: "center", animation: "fadeIn .16s ease" }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Settings" className="poi-scroll" style={{ width: isMobile ? "100%" : 720, maxWidth: "100%", height: isMobile ? "100%" : undefined, maxHeight: isMobile ? "100vh" : "90vh", overflow: "hidden", background: "#fff", borderRadius: isMobile ? 0 : theme.radius.modal, boxShadow: theme.shadow.modal, animation: isMobile ? "fadeIn .16s ease" : "popIn .2s ease", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "calc(14px + env(safe-area-inset-top)) 18px 14px" : "22px 24px 16px", borderBottom: `1px solid ${theme.color.borderSubtle}` }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>Settings</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: isMobile ? 38 : 30, height: isMobile ? 38 : 30, borderRadius: theme.radius.icon, border: "none", background: "#f5f4f2", color: theme.color.textSecondary, cursor: "pointer", fontSize: isMobile ? 18 : 14 }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flex: isMobile ? 1 : undefined, minHeight: isMobile ? 0 : 380, maxHeight: isMobile ? undefined : "76vh" }}>
          <nav
            className={isMobile ? "no-scrollbar" : undefined}
            style={
              isMobile
                ? { display: "flex", flexDirection: "row", gap: 6, padding: "10px 14px", overflowX: "auto", borderBottom: `1px solid ${theme.color.borderSubtle}`, flex: "none" }
                : { width: 190, borderRight: `1px solid ${theme.color.borderSubtle}`, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }
            }
          >
            {visible.map((s) => (
              <button key={s.key} type="button" onClick={() => setActiveKey(s.key)} aria-current={s.key === activeKey} style={{ textAlign: "left", whiteSpace: isMobile ? "nowrap" : "normal", flex: "none", padding: isMobile ? "9px 14px" : "9px 12px", borderRadius: theme.radius.input, border: "none", cursor: "pointer", fontFamily: theme.font.ui, fontSize: 13, fontWeight: s.key === activeKey ? 800 : 600, background: s.key === activeKey ? theme.color.tintBg : "transparent", color: s.key === activeKey ? theme.color.deepIndigoText : theme.color.textBody }}>
                {s.label}
              </button>
            ))}
          </nav>
          <div className="poi-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: isMobile ? "18px 18px calc(18px + env(safe-area-inset-bottom))" : "20px 24px" }}>
            <Active />
          </div>
        </div>
      </div>
    </div>
  );
}
