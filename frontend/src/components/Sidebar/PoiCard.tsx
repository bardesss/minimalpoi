// frontend/src/components/Sidebar/PoiCard.tsx
import type { Category, Poi } from "../../types/api";
import { theme, tintFromColor } from "../../theme";

export function cityFromAddress(address: string | null): string {
  if (!address) return "";
  const parts = address.split(",");
  return parts[parts.length - 1].trim();
}

export default function PoiCard({
  poi,
  category,
  selected,
  onSelect,
}: {
  poi: Poi;
  category: Category | undefined;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  const color = category?.color ?? theme.color.fallbackPin;
  const tint = tintFromColor(color);
  const city = cityFromAddress(poi.address);
  return (
    <button
      type="button"
      onClick={() => onSelect(poi.id)}
      style={{
        textAlign: "left",
        padding: 0,
        cursor: "pointer",
        background: theme.color.surface0,
        borderRadius: theme.radius.card,
        overflow: "hidden",
        border: selected ? `1.5px solid ${theme.color.primary}` : `1px solid ${theme.color.borderSubtle}`,
        boxShadow: selected ? theme.shadow.cardSelected : "none",
        transition: "border-color .12s, transform .12s, box-shadow .12s",
      }}
    >
      <div
        style={{
          height: 78,
          background: poi.image_url ? `center/cover no-repeat url(${poi.image_url}), ${tint}` : tint,
          position: "relative",
        }}
      >
        <span style={{ position: "absolute", left: 8, top: 8, width: 18, height: 18, borderRadius: "50%", background: color, border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }} />
      </div>
      <div style={{ padding: "9px 11px 11px", display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: theme.color.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{poi.name}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: theme.color.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{category?.name ?? "Uncategorized"}</span>
        {city && <span style={{ fontSize: 11, color: theme.color.textPlaceholder, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{city}</span>}
      </div>
    </button>
  );
}
