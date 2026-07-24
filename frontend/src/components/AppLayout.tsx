import type { ReactNode } from "react";
import { useIsMobile } from "../lib/useMediaQuery";
import { theme } from "../theme";
import SidebarHeader from "./Sidebar/SidebarHeader";
import AccountFooter from "./Sidebar/AccountFooter";
import BottomSheet from "./BottomSheet";
import NavToggle from "./NavToggle";

export interface AppLayoutProps {
  active: "map" | "routes";
  routesEnabled: boolean;
  sheetLabel: string;
  collapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  reopenLabel: string;
  sidebar: ReactNode;
  main: ReactNode;
  account: { username: string; role: string; onLogout: () => void; onOpenSettings: () => void; updateAvailable: boolean };
}

const reopenBtn = {
  position: "absolute", top: 16, left: 16, zIndex: 1100, background: "#fff",
  border: `1px solid ${theme.color.borderCard}`, borderRadius: 11, padding: "10px 14px",
  boxShadow: theme.shadow.expand, fontFamily: theme.font.ui, fontWeight: 700, fontSize: 13, cursor: "pointer",
} as const;

export default function AppLayout(props: AppLayoutProps) {
  const isMobile = useIsMobile();
  const nav = props.routesEnabled ? <NavToggle active={props.active} /> : null;
  const footer = <AccountFooter {...props.account} />;

  if (isMobile) {
    return (
      <div style={{ position: "relative", height: "100vh", width: "100vw", background: theme.color.mapBg }}>
        {props.main}
        <BottomSheet label={props.sheetLabel} initial="half">
          {nav}
          {props.sidebar}
          {footer}
        </BottomSheet>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", background: theme.color.pageBg }}>
      <aside
        style={{
          width: props.collapsed ? 0 : 480,
          flex: "none",
          borderRight: props.collapsed ? "none" : `1px solid ${theme.color.borderCard}`,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "width .26s ease",
          zIndex: 1000,
        }}
      >
        {!props.collapsed && (
          <>
            <SidebarHeader onCollapse={props.onCollapse} />
            {nav}
            {props.sidebar}
            {footer}
          </>
        )}
      </aside>
      <main style={{ flex: 1, position: "relative", background: theme.color.mapBg }}>
        {props.main}
        {props.collapsed && (
          <button type="button" onClick={props.onExpand} className="hover-btn" style={reopenBtn}>{props.reopenLabel}</button>
        )}
      </main>
    </div>
  );
}
