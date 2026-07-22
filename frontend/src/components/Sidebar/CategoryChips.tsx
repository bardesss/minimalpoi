import type { Category } from "../../types/api";
import { theme } from "../../theme";
import { UNCATEGORIZED_ID } from "../../lib/filterPois";

export default function CategoryChips({
  categories,
  activeIds,
  onToggle,
  onClear,
  scroll = false,
  showUncategorized = false,
}: {
  categories: Category[];
  activeIds: number[];
  onToggle: (id: number) => void;
  onClear: () => void;
  /** Mobile: lay chips out in a single horizontally scrollable row. */
  scroll?: boolean;
  /** Show an "Uncategorized" chip for places with no category. */
  showUncategorized?: boolean;
}) {
  const layout = scroll
    ? ({ flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch" } as const)
    : ({ flexWrap: "wrap" } as const);
  return (
    <div className={scroll ? "no-scrollbar" : undefined} style={{ display: "flex", gap: 7, padding: "12px 20px", ...layout }}>
      <button type="button" onClick={onClear} style={chip(activeIds.length === 0, theme.color.primary, scroll)}>All</button>
      {categories.map((c) => {
        const active = activeIds.includes(c.id);
        return (
          <button key={c.id} type="button" onClick={() => onToggle(c.id)} style={chip(active, c.color, scroll)} aria-pressed={active}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? "#fff" : c.color, display: "inline-block", flex: "none" }} />
            {c.name}
          </button>
        );
      })}
      {showUncategorized && (() => {
        const active = activeIds.includes(UNCATEGORIZED_ID);
        return (
          <button type="button" onClick={() => onToggle(UNCATEGORIZED_ID)} style={chip(active, theme.color.fallbackPin, scroll)} aria-pressed={active}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? "#fff" : theme.color.fallbackPin, display: "inline-block", flex: "none" }} />
            Uncategorized
          </button>
        );
      })()}
    </div>
  );
}

function chip(active: boolean, color: string, scroll = false) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: scroll ? "9px 14px" : "6px 11px",
    borderRadius: theme.radius.pill,
    border: `1px solid ${active ? color : theme.color.borderStd}`,
    background: active ? color : "#fff",
    color: active ? "#fff" : theme.color.textMuted,
    fontFamily: theme.font.ui,
    fontSize: scroll ? 13 : 12,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flex: "none" as const,
    transition: "all .12s",
  } as const;
}
