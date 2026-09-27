import type { ReactNode } from "react";
import { useIsMobile, useMediaQuery } from "../lib/useMediaQuery";
import { theme } from "../theme";
import SidebarHeader from "./Sidebar/SidebarHeader";
import AccountMenu from "./AccountMenu";
import BottomSheet from "./BottomSheet";
import NavToggle from "./NavToggle";

export interface AppLayoutProps {
  routesEnabled: boolean;
  sheetLabel: string;
  collapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  reopenLabel: string;
  sidebar: ReactNode;
  main: ReactNode;
  account: { username: string; role: string; onLogout: () => void; onOpenSettings: () => void; updateAvailable: boolean };
  sheetCount?: number;
  /** A selected place's detail view. Mobile: replaces the list sheet (which
   * stays mounted, hidden). Desktop: replaces the list inside the sidebar. */
  detail?: ReactNode;
}

const reopenBtn = {
  position: "absolute", top: 16, left: 16, zIndex: 1100, background: "#fff",
  border: `1px solid ${theme.color.borderCard}`, borderRadius: 11, padding: "10px 14px",
  boxShadow: theme.shadow.expand, fontFamily: theme.font.ui, fontWeight: 700, fontSize: 13, cursor: "pointer",
} as const;

function CountBadge({ n }: { n: number }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: theme.color.textSecondary, whiteSpace: "nowrap" }}>
      {n} {n === 1 ? "place" : "places"}
    </span>
  );
}

export default function AppLayout(props: AppLayoutProps) {
  const isMobile = useIsMobile();
  // Give the POI grid's 3rd column (see PoiList) room on very wide screens.
  const wide = useMediaQuery("(min-width: 1600px)");
  const navDesktop = props.routesEnabled ? <NavToggle variant="icon" /> : null;
  const navMobile = props.routesEnabled ? <NavToggle variant="labeled" /> : null;
  const account = <AccountMenu {...props.account} />;

  if (isMobile) {
    return (
      <div style={{ position: "relative", height: "100dvh", width: "100vw", background: theme.color.mapBg }}>
        {props.main}
        <BottomSheet
          label={props.sheetLabel}
          initial="half"
          headerLeft={navMobile ?? undefined}
          headerRight={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              {props.sheetCount != null && <CountBadge n={props.sheetCount} />}
              {account}
            </span>
          }
          hidden={props.detail != null}
        >
          {props.sidebar}
        </BottomSheet>
        {props.detail}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100dvh", width: "100vw", background: theme.color.pageBg }}>
      <aside
        style={{
          width: props.collapsed ? 0 : wide ? 640 : 480,
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
          <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {/* The list stays mounted under the detail so its scroll position survives. */}
            <div
              inert={props.detail != null || undefined}
              aria-hidden={props.detail != null || undefined}
              style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", visibility: props.detail != null ? "hidden" : undefined }}
            >
              <SidebarHeader onCollapse={props.onCollapse} nav={navDesktop} account={account} />
              {props.sidebar}
            </div>
            {props.detail != null && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>{props.detail}</div>
            )}
          </div>
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
