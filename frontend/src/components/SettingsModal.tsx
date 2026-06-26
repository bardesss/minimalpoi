import { useState, type ComponentType } from "react";
import { useAuth } from "../auth/AuthContext";
import { theme } from "../theme";
import AboutSection from "./settings/AboutSection";
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

const SECTIONS: SectionDef[] = [
  { key: "connections", label: "Connections", adminOnly: true, Component: ConnectionsSection },
  { key: "map", label: "Map", adminOnly: true, Component: MapSection },
  { key: "users", label: "Users", adminOnly: true, Component: UsersSection },
  { key: "teams", label: "Teams", adminOnly: false, Component: TeamsSection },
  { key: "categories", label: "Categories", adminOnly: false, Component: CategoriesSection },
  { key: "tags", label: "Tags", adminOnly: false, Component: TagsSection },
  { key: "sync", label: "Sync", adminOnly: true, Component: SyncSection },
  { key: "data", label: "Data & backups", adminOnly: false, Component: DataSection },
  { key: "about", label: "About", adminOnly: false, Component: AboutSection },
];

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const visible = SECTIONS.filter((s) => !s.adminOnly || isAdmin);
  const [activeKey, setActiveKey] = useState(visible[0]?.key ?? "data");
  const active = visible.find((s) => s.key === activeKey) ?? visible[0];
  if (!active) return null;
  const Active = active.Component;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(26,24,22,.42)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn .16s ease" }}>
      <div role="dialog" aria-modal="true" aria-label="Settings" className="poi-scroll" style={{ width: 720, maxWidth: "100%", maxHeight: "90vh", overflow: "hidden", background: "#fff", borderRadius: theme.radius.modal, boxShadow: theme.shadow.modal, animation: "popIn .2s ease", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: `1px solid ${theme.color.borderSubtle}` }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>Settings</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 30, height: 30, borderRadius: theme.radius.icon, border: "none", background: "#f5f4f2", color: theme.color.textSecondary, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "flex", minHeight: 380, maxHeight: "76vh" }}>
          <nav style={{ width: 190, borderRight: `1px solid ${theme.color.borderSubtle}`, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
            {visible.map((s) => (
              <button key={s.key} type="button" onClick={() => setActiveKey(s.key)} aria-current={s.key === activeKey} style={{ textAlign: "left", padding: "9px 12px", borderRadius: theme.radius.input, border: "none", cursor: "pointer", fontFamily: theme.font.ui, fontSize: 13, fontWeight: s.key === activeKey ? 800 : 600, background: s.key === activeKey ? theme.color.tintBg : "transparent", color: s.key === activeKey ? theme.color.deepIndigoText : theme.color.textBody }}>
                {s.label}
              </button>
            ))}
          </nav>
          <div className="poi-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            <Active />
          </div>
        </div>
      </div>
    </div>
  );
}
