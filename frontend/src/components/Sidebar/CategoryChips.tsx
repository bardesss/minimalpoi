import type { Category } from "../../types/api";
import { theme } from "../../theme";

export default function CategoryChips({
  categories,
  activeIds,
  onToggle,
  onClear,
}: {
  categories: Category[];
  activeIds: number[];
  onToggle: (id: number) => void;
  onClear: () => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "12px 20px" }}>
      <button type="button" onClick={onClear} style={chip(activeIds.length === 0, theme.color.primary)}>All</button>
      {categories.map((c) => {
        const active = activeIds.includes(c.id);
        return (
          <button key={c.id} type="button" onClick={() => onToggle(c.id)} style={chip(active, c.color)} aria-pressed={active}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? "#fff" : c.color, display: "inline-block" }} />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

function chip(active: boolean, color: string) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 11px",
    borderRadius: theme.radius.pill,
    border: `1px solid ${active ? color : theme.color.borderStd}`,
    background: active ? color : "#fff",
    color: active ? "#fff" : theme.color.textMuted,
    fontFamily: theme.font.ui,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .12s",
  } as const;
}
