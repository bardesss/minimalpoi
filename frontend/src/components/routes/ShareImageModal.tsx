import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { MapSettings, RouteDetail } from "../../types/api";
import { ghostButtonStyle, primaryButtonStyle, theme } from "../../theme";
import { SHARE_FORMATS, shareFormat, type ShareFormat, type ShareVariant } from "../../lib/share/shareFormats";
import { renderShareImage } from "../../lib/share/shareRender";
import { shareFilename } from "../../lib/share/shareFilename";
import { triggerDownload } from "../../lib/download";
import { useDialog } from "../../lib/useDialog";

const VARIANTS: { key: ShareVariant; label: string }[] = [
  { key: "map", label: "Map background" },
  { key: "transparent", label: "Transparent" },
];

export default function ShareImageModal({ route, settings, onClose }: { route: RouteDetail; settings: MapSettings; onClose: () => void }) {
  const { dialogRef, onBackdropClick } = useDialog<HTMLDivElement>(onClose);
  const [format, setFormat] = useState<ShareFormat>("square");
  const [variant, setVariant] = useState<ShareVariant>("map");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);
    renderShareImage({ route, settings, format: shareFormat(format), variant })
      .then((b) => {
        if (cancelled) return;
        setBlob(b);
        setUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(b); });
      })
      .catch(() => { if (!cancelled) setError("Couldn't render the image. Try another format."); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [route, settings, format, variant]);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  function onDownload() {
    if (blob) triggerDownload(blob, shareFilename(route.name, format, variant));
  }
  async function onShare() {
    if (!blob) return;
    const file = new File([blob], shareFilename(route.name, format, variant), { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: route.name }); } catch { /* dismissed */ }
    }
  }
  const canShare = typeof navigator !== "undefined" && !!navigator.canShare;

  const chip = (active: boolean) => ({ ...ghostButtonStyle, padding: "6px 12px", ...(active ? { borderColor: theme.color.deepIndigoText, color: theme.color.deepIndigoText } : {}) });

  // Portalled to document.body (matches NavigateDayModal) so it escapes the
  // transformed mobile bottom-sheet containing-block; z-index/radius match the
  // house modal style.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Share route image" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2100 }} onClick={onBackdropClick}>
      <div ref={dialogRef} style={{ background: theme.color.surface0, borderRadius: theme.radius.modal, padding: 16, width: 420, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <strong style={{ fontFamily: theme.font.ui }}>Share route image</strong>
          <button type="button" aria-label="Close" style={{ ...ghostButtonStyle, padding: "4px 10px" }} onClick={onClose}>×</button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {SHARE_FORMATS.map((f) => (
            <button key={f.key} type="button" style={chip(format === f.key)} onClick={() => setFormat(f.key)}>{f.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {VARIANTS.map((v) => (
            <button key={v.key} type="button" style={chip(variant === v.key)} onClick={() => setVariant(v.key)}>{v.label}</button>
          ))}
        </div>

        <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center", background: theme.color.surface1, borderRadius: theme.radius.input, marginBottom: 12, overflow: "hidden" }}>
          {busy ? <span style={{ fontSize: 13, color: theme.color.textPlaceholder }}>Rendering…</span>
            : error ? <span role="status" style={{ fontSize: 13, color: theme.color.dangerText }}>{error}</span>
            : url ? <img src={url} alt="Route preview" style={{ maxWidth: "100%", maxHeight: 360 }} />
            : null}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={primaryButtonStyle} onClick={onDownload} disabled={!blob || busy || !!error}>Download</button>
          {canShare && <button type="button" style={ghostButtonStyle} onClick={onShare} disabled={!blob || busy || !!error}>Share</button>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
