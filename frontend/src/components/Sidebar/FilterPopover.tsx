import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { SlidersHorizontal } from "lucide-react";
import { ghostButtonStyle, theme } from "../../theme";
import { useIsMobile } from "../../lib/useMediaQuery";
import type { MapViewMode } from "../../lib/mapViewPref";
import type { SortMode } from "../../lib/sortPref";
import type { VisitedFilter } from "../../types/api";
import FilterControls from "./FilterControls";

/** Icon-button that collapses the visited / sort / map-view controls behind a popover (mobile). */
export default function FilterPopover({
  visited,
  onVisitedChange,
  sortMode,
  onSortChange,
  viewMode,
  onViewModeChange,
  mobile = false,
}: {
  visited: VisitedFilter;
  onVisitedChange: (v: VisitedFilter) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
  mobile?: boolean;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const active = visited !== "any";
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Move focus into the panel whenever it opens (mirrors ExportMenu's focus
  // handling), so Escape (handled on the panel) actually receives the key.
  // Unlike ExportMenu's roving-tabindex menu, this panel holds three
  // independently-tabbable native controls (Visited select, Sort select, Map
  // view buttons) — Tab must traverse between them without closing the panel.
  useEffect(() => {
    if (open) {
      const first = panelRef.current?.querySelector<HTMLElement>("select,button,[tabindex]");
      first?.focus();
    }
  }, [open]);

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function onPanelKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        className="hover-btn"
        aria-label="Filters"
        aria-haspopup="true"
        aria-expanded={open}
        data-active={active}
        onClick={() => (open ? close(false) : setOpen(true))}
        style={{ ...ghostButtonStyle, position: "relative", padding: "6px 10px", minHeight: isMobile ? 44 : undefined, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        <SlidersHorizontal size={isMobile ? 18 : 15} />
        {active && (
          <span
            aria-hidden
            style={{ position: "absolute", top: 2, right: 2, width: 7, height: 7, borderRadius: "50%", background: theme.color.primary }}
          />
        )}
      </button>
      {open && (
        <>
          <div data-testid="filter-backdrop" onClick={() => close(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
          <div
            ref={panelRef}
            onKeyDown={onPanelKeyDown}
            style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 11, background: "#fff", border: `1px solid ${theme.color.borderCard}`, borderRadius: theme.radius.input, boxShadow: theme.shadow.modal, padding: 10, display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}
          >
            <FilterControls
              visited={visited}
              onVisitedChange={onVisitedChange}
              sortMode={sortMode}
              onSortChange={onSortChange}
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              mobile={mobile}
            />
          </div>
        </>
      )}
    </div>
  );
}
