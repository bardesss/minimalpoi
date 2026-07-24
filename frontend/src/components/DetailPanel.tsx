import { useState } from "react";
import type { Category, Poi } from "../types/api";
import { dangerButtonStyle, primaryButtonStyle, theme, tintFromColor } from "../theme";
import { safeImageCss, safeLinkHref } from "../lib/safeUrl";
import { formatPhoneDisplay } from "../lib/phone";
import { useDialog } from "../lib/useDialog";
import PoiActions from "./PoiActions";

const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" } as const;

export default function DetailPanel({
  poi,
  category,
  onClose,
  onEdit,
  onDelete,
  mobile = false,
}: {
  poi: Poi;
  category: Category | undefined;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  mobile?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  // Not a backdrop modal: Escape/back/return-focus always apply, but the
  // focus trap only makes sense in the full-screen mobile branch — the
  // desktop side panel is non-modal and trapping it would strand keyboard
  // focus away from the list/map.
  const { dialogRef } = useDialog<HTMLDivElement>(onClose, { closeOnBackdrop: false, trapFocus: mobile });
  const color = category?.color ?? theme.color.fallbackPin;
  const tint = tintFromColor(color);
  const heroImage = safeImageCss(poi.image_url);
  const websiteHref = safeLinkHref(poi.website);

  const hero = (
    <div style={{ position: "relative", height: 208, flex: "none", background: heroImage ? `center/cover no-repeat url("${heroImage}"), ${tint}` : tint }}>
      <div style={{ position: "absolute", inset: 0, background: theme.gradient.detailHero }} />
      <button type="button" aria-label="Close" onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.92)", boxShadow: "0 2px 8px rgba(0,0,0,.18)", cursor: "pointer", fontSize: 16 }}>×</button>
      <span style={{ position: "absolute", left: 18, bottom: 14, padding: "4px 12px", borderRadius: theme.radius.pill, background: color, color: "#fff", fontWeight: 700, fontSize: 12 }}>{category?.name ?? "Uncategorized"}</span>
    </div>
  );

  const body = (
    <div style={{ padding: "18px 20px 20px" }}>
      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.15 }}>{poi.name}</h2>
      {poi.address && <p style={{ margin: "8px 0 4px", fontSize: 13.5, color: theme.color.textSecondary }}>📍 {poi.address}</p>}
      <p style={{ margin: "0 0 16px", fontFamily: theme.font.mono, fontSize: 11.5, color: theme.color.textCoord }}>{poi.lat.toFixed(5)}, {poi.lng.toFixed(5)}</p>

      {(poi.phone || poi.website || poi.email) && (
        <div style={{ borderRadius: theme.radius.card, border: `1px solid ${theme.color.borderSubtle}`, background: theme.color.pageBg, overflow: "hidden", marginBottom: 16 }}>
          {poi.phone && <div style={{ padding: "11px 14px", fontSize: 13, fontWeight: 500 }}>{formatPhoneDisplay(poi.phone)}</div>}
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

  const footer = (
    <div style={{ display: "flex", gap: 9, padding: "14px 18px", paddingBottom: mobile ? "calc(14px + env(safe-area-inset-bottom))" : 14, borderTop: `1px solid ${theme.color.borderSubtle}`, background: "#fff", flex: "none" }}>
      <button type="button" onClick={onEdit} style={{ ...primaryButtonStyle, flex: 1 }}>Edit place</button>
      <button type="button" onClick={() => (confirming ? onDelete() : setConfirming(true))} style={dangerButtonStyle}>
        {confirming ? "Confirm delete?" : "Delete"}
      </button>
    </div>
  );

  if (mobile) {
    // Full-screen overlay: an opaque view that covers the map; return via the
    // hero close button (×). No drag — predictable and roomy.
    return (
      <section
        ref={dialogRef}
        aria-label={poi.name}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="poi-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {hero}
          {body}
        </div>
        {footer}
      </section>
    );
  }

  return (
    <div
      ref={dialogRef}
      style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 368, zIndex: 800, background: "#fff", boxShadow: theme.shadow.detail, display: "flex", flexDirection: "column", animation: "slideIn .22s ease" }}
    >
      <div className="poi-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {hero}
        {body}
      </div>
      {footer}
    </div>
  );
}
