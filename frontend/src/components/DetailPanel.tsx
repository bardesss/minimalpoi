import { useState } from "react";
import type { Category, Poi } from "../types/api";
import { dangerButtonStyle, primaryButtonStyle, theme, tintFromColor } from "../theme";

const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" } as const;

export default function DetailPanel({
  poi,
  category,
  onClose,
  onEdit,
  onDelete,
}: {
  poi: Poi;
  category: Category | undefined;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const color = category?.color ?? theme.color.fallbackPin;
  const tint = tintFromColor(color);
  return (
    <div className="poi-scroll" style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 368, zIndex: 800, background: "#fff", boxShadow: theme.shadow.detail, overflowY: "auto", animation: "slideIn .22s ease" }}>
      <div style={{ position: "relative", height: 208, background: poi.image_url ? `center/cover no-repeat url(${poi.image_url}), ${tint}` : tint }}>
        <div style={{ position: "absolute", inset: 0, background: theme.gradient.detailHero }} />
        <button type="button" aria-label="Close" onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.92)", boxShadow: "0 2px 8px rgba(0,0,0,.18)", cursor: "pointer", fontSize: 16 }}>×</button>
        <span style={{ position: "absolute", left: 18, bottom: 14, padding: "4px 12px", borderRadius: theme.radius.pill, background: color, color: "#fff", fontWeight: 700, fontSize: 12 }}>{category?.name ?? "Uncategorized"}</span>
      </div>
      <div style={{ padding: "18px 20px 20px" }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.15 }}>{poi.name}</h2>
        {poi.address && <p style={{ margin: "8px 0 4px", fontSize: 13.5, color: theme.color.textSecondary }}>📍 {poi.address}</p>}
        <p style={{ margin: "0 0 16px", fontFamily: theme.font.mono, fontSize: 11.5, color: theme.color.textCoord }}>{poi.lat.toFixed(5)}, {poi.lng.toFixed(5)}</p>

        {(poi.phone || poi.website || poi.email) && (
          <div style={{ borderRadius: theme.radius.card, border: `1px solid ${theme.color.borderSubtle}`, background: theme.color.pageBg, overflow: "hidden", marginBottom: 16 }}>
            {poi.phone && <div style={{ padding: "11px 14px", fontSize: 13, fontWeight: 500 }}>{poi.phone}</div>}
            {poi.website && <a href={poi.website} target="_blank" rel="noreferrer" style={{ display: "block", padding: "11px 14px", fontSize: 13, fontWeight: 600, color: theme.color.link, textDecoration: "none" }}>{poi.website.replace(/^https?:\/\//, "")}</a>}
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
      </div>
      <div style={{ display: "flex", gap: 9, padding: "14px 18px", borderTop: `1px solid ${theme.color.borderSubtle}` }}>
        <button type="button" onClick={onEdit} style={{ ...primaryButtonStyle, flex: 1 }}>Edit place</button>
        <button type="button" onClick={() => (confirming ? onDelete() : setConfirming(true))} style={dangerButtonStyle}>
          {confirming ? "Confirm delete?" : "Delete"}
        </button>
      </div>
    </div>
  );
}
