import type { Category, Poi, VisitedFilter } from "../../types/api";
import type { MapViewMode } from "../../lib/mapViewPref";
import type { SortMode } from "../../lib/sortPref";
import CategoryChips from "./CategoryChips";
import FilterPopover from "./FilterPopover";
import ListToolbar from "./ListToolbar";
import PoiList from "./PoiList";
import SearchBox from "./SearchBox";

export interface SidebarContentProps {
  search: string;
  onSearch: (v: string) => void;
  categories: Category[];
  activeCategoryIds: number[];
  onToggleCategory: (id: number) => void;
  onClearCategories: () => void;
  /** Whether any place has no category (drives the "Uncategorized" chip). */
  hasUncategorized: boolean;
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
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  /** Mobile: chips scroll horizontally and the filters tuck beside the search box. */
  mobile?: boolean;
}

/** Search + filters + results list — shared by the desktop aside and the mobile sheet. */
export default function SidebarContent(props: SidebarContentProps) {
  const filterProps = {
    visited: props.visited,
    onVisitedChange: props.onVisitedChange,
    sortMode: props.sortMode,
    onSortChange: props.onSortChange,
    viewMode: props.viewMode,
    onViewModeChange: props.onViewModeChange,
  };
  return (
    <>
      <SearchBox
        value={props.search}
        onChange={props.onSearch}
        // Mobile tucks the filters trigger beside search so it doesn't cost a row;
        // desktop shows the filters inline in their own bar below the chips.
        trailing={props.mobile ? <FilterPopover {...filterProps} mobile /> : undefined}
      />
      <CategoryChips
        categories={props.categories}
        activeIds={props.activeCategoryIds}
        onToggle={props.onToggleCategory}
        onClear={props.onClearCategories}
        scroll={props.mobile}
        showUncategorized={props.hasUncategorized}
      />
      {!props.mobile && <ListToolbar {...filterProps} count={props.pois.length} />}
      <PoiList
        pois={props.pois}
        categoriesById={props.categoriesById}
        myVisitedPoiIds={props.myVisitedPoiIds}
        selectedId={props.selectedId}
        onSelect={props.onSelect}
        isLoading={props.isLoading}
        isError={props.isError}
        onRetry={props.onRetry}
      />
    </>
  );
}
