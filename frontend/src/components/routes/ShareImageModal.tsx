import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { MapSettings, RouteDetail } from "../../types/api";
import { ghostButtonStyle, primaryButtonStyle, theme } from "../../theme";
import { SHARE_FORMATS, shareFormat, type ShareFormat, type ShareVariant } from "../../lib/share/shareFormats";
import { renderShareImage } from "../../lib/share/shareRender";
import { shareFilename, sharePdfFilename } from "../../lib/share/shareFilename";
import { renderSharePdf } from "../../lib/share/sharePdf";
import { triggerDownload } from "../../lib/download";
import { useDialog } from "../../lib/useDialog";

const VARIANTS: { key: ShareVariant; label: string }[] = [
  { key: "map", label: "Map background" },
  { key: "transparent", label: "Transparent" },
];

type OutputMode = ShareFormat | "pdf";

export default function ShareImageModal({ route, settings, onClose }: { route: RouteDetail; settings: MapSettings; onClose: () => void }) {
  const { dialogRef, onBackdropClick } = useDialog<HTMLDivElement>(onClose);
  const [format, setFormat] = useState<OutputMode>("square");
  const [variant, setVariant] = useState<ShareVariant>("map");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Separate from `busy`: PDF generation calls renderSharePdf fresh (it never
  // reuses the on-screen preview blob), so the Download/Share buttons in pdf
  // mode shouldn't sit disabled while the decorative landscape preview is
  // (re)loading in the background.
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);
    const imgFormat = shareFormat(format === "pdf" ? "landscape" : format);
    renderShareImage({ route, settings, format: imgFormat, variant })
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

  async function onDownload() {
    if (format === "pdf") {
      setPdfBusy(true); setError(null);
      try {
        const pdf = await renderSharePdf({ route, settings, variant });
        triggerDownload(pdf, sharePdfFilename(route.name));
      } catch { setError("Couldn't render the PDF. Try again."); }
      finally { setPdfBusy(false); }
      return;
    }
    if (blob) triggerDownload(blob, shareFilename(route.name, format, variant));
  }
  async function onShare() {
    if (format === "pdf") {
      setPdfBusy(true); setError(null);
      try {
        const pdf = await renderSharePdf({ route, settings, variant });
        const file = new File([pdf], sharePdfFilename(route.name), { type: "application/pdf" });
        if (navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ files: [file], title: route.name }); } catch { /* dismissed */ }
        }
      } catch { setError("Couldn't render the PDF. Try again."); }
      finally { setPdfBusy(false); }
      return;
    }
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
          <button type="button" style={chip(format === "pdf")} onClick={() => setFormat("pdf")}>PDF</button>
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
        {format === "pdf" && (
          <p style={{ fontSize: 12, color: theme.color.textSecondary, margin: "0 0 12px" }}>PDF: map above + full day-by-day itinerary.</p>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={primaryButtonStyle} onClick={onDownload} disabled={format === "pdf" ? (pdfBusy || !!error) : (busy || !!error || !blob)}>{format === "pdf" ? "Download PDF" : "Download"}</button>
          {canShare && <button type="button" style={ghostButtonStyle} onClick={onShare} disabled={format === "pdf" ? (pdfBusy || !!error) : (busy || !!error || !blob)}>Share</button>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
