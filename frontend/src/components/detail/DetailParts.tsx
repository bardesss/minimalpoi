import type { CSSProperties, ReactNode } from "react";
import type { Category, Poi } from "../../types/api";
import { theme, tintFromColor } from "../../theme";
import { safeImageCss, safeLinkHref } from "../../lib/safeUrl";
import { formatPhoneDisplay, telHref } from "../../lib/phone";
import { CategoryIcon } from "../../lib/categoryIcon";
import { useIsCoarsePointer } from "../../lib/useMediaQuery";
import PoiActions from "../PoiActions";
import PlaceActionRow from "./PlaceActionRow";

const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" } as const;

export function CloseButton({ onClick, style }: { onClick: () => void; style?: CSSProperties }) {
  const coarse = useIsCoarsePointer();
  const size = coarse ? 44 : 32;
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClick}
      style={{ width: size, height: size, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.92)", boxShadow: "0 2px 8px rgba(0,0,0,.18)", cursor: "pointer", fontSize: coarse ? 20 : 16, flex: "none", ...style }}
    >
      ×
    </button>
  );
}

export function CategoryPill({ category }: { category: Category | undefined }) {
  const color = category?.color ?? theme.color.fallbackPin;
  return (
    <span style={{ padding: "4px 12px", borderRadius: theme.radius.pill, background: color, color: "#fff", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
      {category?.name ?? "Uncategorized"}
    </span>
  );
}

/** Photo hero when the place has an image; otherwise a slim tinted band with
 * the category icon, so an empty 208px block doesn't push the details down. */
export function DetailHero({ poi, category, compact = false, overlay }: { poi: Poi; category: Category | undefined; compact?: boolean; overlay?: ReactNode }) {
  const color = category?.color ?? theme.color.fallbackPin;
  const tint = tintFromColor(color);
  const image = safeImageCss(poi.image_url);
  if (!image && compact) return null;
  const height = image ? (compact ? 160 : 208) : 72;
  return (
    <div data-testid="detail-hero" style={{ position: "relative", height, flex: "none", background: image ? `center/cover no-repeat url("${image}"), ${tint}` : tint }}>
      {image ? (
        <div style={{ position: "absolute", inset: 0, background: theme.gradient.detailHero }} />
      ) : (
        <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", display: "inline-flex" }}>
          <CategoryIcon name={category?.icon ?? null} size={26} color={color} />
        </span>
      )}
      {overlay}
      <span style={{ position: "absolute", left: image ? 18 : 56, bottom: image ? 14 : "50%", transform: image ? undefined : "translateY(50%)" }}>
        <CategoryPill category={category} />
      </span>
    </div>
  );
}

/** Name, address and the one-tap actions — the part the mobile sheet shows at peek. */
export function DetailSummary({ poi }: { poi: Poi }) {
  return (
    <div style={{ padding: "18px 20px 0" }}>
      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.15 }}>{poi.name}</h2>
      {poi.address && <p style={{ margin: "8px 0 12px", fontSize: 13.5, color: theme.color.textSecondary }}>📍 {poi.address}</p>}
      {!poi.address && <div style={{ height: 12 }} />}
      <PlaceActionRow poi={poi} />
    </div>
  );
}

/** Coordinates, contact details, tags, notes and reviews. */
export function DetailBody({ poi }: { poi: Poi }) {
  const websiteHref = safeLinkHref(poi.website);
  const tel = telHref(poi.phone);
  return (
    <div style={{ padding: "0 20px 20px" }}>
      <p style={{ margin: "0 0 16px", fontFamily: theme.font.mono, fontSize: 11.5, color: theme.color.textCoord }}>{poi.lat.toFixed(5)}, {poi.lng.toFixed(5)}</p>

      {(poi.phone || poi.website || poi.email) && (
        <div style={{ borderRadius: theme.radius.card, border: `1px solid ${theme.color.borderSubtle}`, background: theme.color.pageBg, overflow: "hidden", marginBottom: 16 }}>
          {poi.phone && (tel
            ? <a href={tel} style={{ display: "block", padding: "11px 14px", fontSize: 13, fontWeight: 500, color: theme.color.textBody, textDecoration: "none" }}>{formatPhoneDisplay(poi.phone)}</a>
            : <div style={{ padding: "11px 14px", fontSize: 13, fontWeight: 500 }}>{formatPhoneDisplay(poi.phone)}</div>)}
          {poi.website && (websiteHref
            ? <a href={websiteHref} target="_blank" rel="noreferrer" style={{ display: "block", padding: "11px 14px", fontSize: 13, fontWeight: 600, color: theme.color.link, textDecoration: "none" }}>{poi.website.replace(/^https?:\/\//, "")}</a>
            : <div style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: theme.color.textBody }}>{poi.website.replace(/^https?:\/\//, "")}</div>)}
          {poi.email && <a href={`mailto:${poi.email}`} style={{ display: "block", padding: "11px 14px", fontSize: 13, fontWeight: 500, color: theme.color.textBody, textDecoration: "none" }}>{poi.email}</a>}
        </div>
      )}

      {poi.tags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={sectionLabel}>Tags</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {poi.tags.map((t) => (
              <span key={t} style={{ padding: "5px 10px", borderRadius: theme.radius.tag, background: theme.color.surface1, color: theme.color.textMuted, fontSize: 12, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {poi.notes && (
        <div>
          <p style={sectionLabel}>Notes</p>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: theme.color.textBody }}>{poi.notes}</p>
        </div>
      )}

      <PoiActions poiId={poi.id} />
    </div>
  );
}
