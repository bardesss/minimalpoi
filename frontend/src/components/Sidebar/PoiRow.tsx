import { memo } from "react";
import type { Category, Poi } from "../../types/api";
import { theme } from "../../theme";
import { safeImageCss } from "../../lib/safeUrl";
import { cityFromAddress, countryCodeFromAddress } from "../../lib/country";
import Flag from "../Flag";

/** Compact one-line list entry (the "List" density): category dot, name,
 * city + flag, rating, visited check and a small thumbnail when there's a photo. */
function PoiRow({
  poi,
  category,
  selected,
  onSelect,
  visited = false,
  onHover,
}: {
  poi: Poi;
  category: Category | undefined;
  selected: boolean;
  onSelect: (id: number) => void;
  visited?: boolean;
  /** Hover/focus in (id) and out (null) — drives the map pin highlight. */
  onHover?: (id: number | null) => void;
}) {
  const color = category?.color ?? theme.color.fallbackPin;
  const thumb = safeImageCss(poi.image_url);
  const city = poi.city ?? cityFromAddress(poi.address);
  const countryCode = poi.country_code ?? countryCodeFromAddress(poi.address);
  return (
    <button
      type="button"
      onClick={() => onSelect(poi.id)}
      className="hover-row"
      aria-current={selected ? "true" : undefined}
      onMouseEnter={() => onHover?.(poi.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(poi.id)}
      onBlur={() => onHover?.(null)}
      style={{
        width: "100%",
        minHeight: 48,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "4px 10px",
        textAlign: "left",
        cursor: "pointer",
        background: selected ? theme.color.tintBg : theme.color.surface0,
        border: selected ? `1.5px solid ${theme.color.primary}` : `1px solid ${theme.color.borderSubtle}`,
        borderRadius: theme.radius.card,
      }}
    >
      <span aria-hidden style={{ flex: "none", width: 12, height: 12, borderRadius: "50%", background: color, border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: theme.color.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{poi.name}</span>
        {(city || countryCode) && (
          <span style={{ fontSize: 11, color: theme.color.textPlaceholder, display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
            {city && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{city}</span>}
            <Flag code={countryCode} />
          </span>
        )}
      </span>
      {poi.avg_rating != null && (
        <span
          aria-label={`Average rating ${poi.avg_rating.toFixed(1)} from ${poi.rating_count} ${poi.rating_count === 1 ? "rating" : "ratings"}`}
          style={{ flex: "none", fontSize: 11.5, fontWeight: 700, color: theme.color.textSecondary }}
        >
          <span aria-hidden style={{ color: theme.color.starActive }}>★</span> {poi.avg_rating.toFixed(1)}
        </span>
      )}
      {visited && (
        <span aria-label="Visited by you" title="Visited" style={{ flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: theme.color.primary, color: "#fff", fontSize: 11, fontWeight: 800 }}>
          <span aria-hidden>✓</span>
        </span>
      )}
      {thumb && (
        <span data-testid="row-thumb" aria-hidden style={{ flex: "none", width: 40, height: 40, borderRadius: 8, background: `center/cover no-repeat url("${thumb}")` }} />
      )}
    </button>
  );
}

export default memo(PoiRow);
