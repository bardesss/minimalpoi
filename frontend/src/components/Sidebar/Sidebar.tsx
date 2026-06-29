import type { Category, Poi, VisitedFilter } from "../../types/api";
import { theme } from "../../theme";
import AccountFooter from "./AccountFooter";
import SidebarContent from "./SidebarContent";
import SidebarHeader from "./SidebarHeader";

export interface SidebarProps {
  collapsed: boolean;
  onCollapse: () => void;
  search: string;
  onSearch: (v: string) => void;
  categories: Category[];
  activeCategoryIds: number[];
  onToggleCategory: (id: number) => void;
  onClearCategories: () => void;
  visited: VisitedFilter;
  onVisitedChange: (v: VisitedFilter) => void;
  pois: Poi[];
  categoriesById: Record<number, Category>;
  myVisitedPoiIds: Set<number>;
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onFit: () => void;
  username: string;
  role: string;
  onLogout: () => void;
  onOpenSettings: () => void;
  updateAvailable: boolean;
}

export default function Sidebar(props: SidebarProps) {
  return (
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
      <SidebarHeader onCollapse={props.onCollapse} />
      <SidebarContent
        search={props.search}
        onSearch={props.onSearch}
        categories={props.categories}
        activeCategoryIds={props.activeCategoryIds}
        onToggleCategory={props.onToggleCategory}
        onClearCategories={props.onClearCategories}
        visited={props.visited}
        onVisitedChange={props.onVisitedChange}
        pois={props.pois}
        categoriesById={props.categoriesById}
        myVisitedPoiIds={props.myVisitedPoiIds}
        selectedId={props.selectedId}
        onSelect={props.onSelect}
        isLoading={props.isLoading}
        isError={props.isError}
        onRetry={props.onRetry}
        onFit={props.onFit}
      />
      <AccountFooter username={props.username} role={props.role} onLogout={props.onLogout} onOpenSettings={props.onOpenSettings} updateAvailable={props.updateAvailable} />
    </aside>
  );
}
