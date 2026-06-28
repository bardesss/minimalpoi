// frontend/src/components/Sidebar/PoiCard.tsx
import type { Category, Poi } from "../../types/api";
import { theme, tintFromColor } from "../../theme";
import { safeImageCss } from "../../lib/safeUrl";
import { cityFromAddress, countryCodeFromAddress } from "../../lib/country";
import Flag from "../Flag";

export { cityFromAddress } from "../../lib/country";

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
  const thumb = safeImageCss(poi.image_url);
  // Prefer the precise enrichment fields; fall back to parsing the address.
  const city = poi.city ?? cityFromAddress(poi.address);
  const countryCode = poi.country_code ?? countryCodeFromAddress(poi.address);
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
          background: thumb ? `center/cover no-repeat url("${thumb}"), ${tint}` : tint,
          position: "relative",
        }}
      >
        <span style={{ position: "absolute", left: 8, top: 8, width: 18, height: 18, borderRadius: "50%", background: color, border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }} />
        {poi.avg_rating != null && (
          <span
            aria-label={`Average rating ${poi.avg_rating.toFixed(1)} from ${poi.rating_count} ${poi.rating_count === 1 ? "rating" : "ratings"}`}
            style={{ position: "absolute", right: 8, top: 8, display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 999, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: 1.4 }}
          >
            <span aria-hidden style={{ color: theme.color.fallbackPin }}>★</span>
            {poi.avg_rating.toFixed(1)}
          </span>
        )}
      </div>
      <div style={{ padding: "9px 11px 11px", display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: theme.color.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{poi.name}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: theme.color.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{category?.name ?? "Uncategorized"}</span>
        {(city || countryCode) && (
          <span style={{ fontSize: 11, color: theme.color.textPlaceholder, display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
            {city && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{city}</span>}
            <Flag code={countryCode} />
          </span>
        )}
      </div>
    </button>
  );
}
