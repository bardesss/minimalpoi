import type { Category, Poi, VisitedFilter } from "../../types/api";
import CategoryChips from "./CategoryChips";
import FilterBar from "./FilterBar";
import PoiList from "./PoiList";
import ResultsMeta from "./ResultsMeta";
import SearchBox from "./SearchBox";

export interface SidebarContentProps {
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
  /** Mobile: chips scroll horizontally to keep the sheet header short. */
  mobile?: boolean;
}

/** Search + filters + results list — shared by the desktop aside and the mobile sheet. */
export default function SidebarContent(props: SidebarContentProps) {
  return (
    <>
      <SearchBox value={props.search} onChange={props.onSearch} />
      <CategoryChips
        categories={props.categories}
        activeIds={props.activeCategoryIds}
        onToggle={props.onToggleCategory}
        onClear={props.onClearCategories}
        scroll={props.mobile}
      />
      <FilterBar value={props.visited} onChange={props.onVisitedChange} />
      <ResultsMeta count={props.pois.length} onFit={props.onFit} />
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
