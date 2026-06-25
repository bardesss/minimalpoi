import type { Category, Poi } from "../../types/api";
import { theme } from "../../theme";
import AccountFooter from "./AccountFooter";
import CategoryChips from "./CategoryChips";
import PoiList from "./PoiList";
import ResultsMeta from "./ResultsMeta";
import SearchBox from "./SearchBox";
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
  pois: Poi[];
  categoriesById: Record<number, Category>;
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
      <SearchBox value={props.search} onChange={props.onSearch} />
      <CategoryChips categories={props.categories} activeIds={props.activeCategoryIds} onToggle={props.onToggleCategory} onClear={props.onClearCategories} />
      <ResultsMeta count={props.pois.length} onFit={props.onFit} />
      <PoiList pois={props.pois} categoriesById={props.categoriesById} selectedId={props.selectedId} onSelect={props.onSelect} isLoading={props.isLoading} isError={props.isError} onRetry={props.onRetry} />
      <AccountFooter username={props.username} role={props.role} onLogout={props.onLogout} onOpenSettings={props.onOpenSettings} />
    </aside>
  );
}
