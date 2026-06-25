import { useRef, useState } from "react";
import { useImportPois } from "../queries/hooks";
import { exportPois } from "../api/portability";
import { triggerDownload } from "../lib/download";
import type { ImportResult } from "../types/api";
import { ghostButtonStyle, primaryButtonStyle, theme } from "../theme";

const sectionCard = {
  border: `1px solid ${theme.color.borderCard}`,
  borderRadius: 14,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 14,
} as const;

const rowLabel = { fontSize: 13, fontWeight: 800, letterSpacing: "-.01em" } as const;
const rowHint = { margin: "2px 0 0", fontSize: 12, color: theme.color.textSecondary } as const;

export default function DataModal({ onClose }: { onClose: () => void }) {
  const importPois = useImportPois();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError(null);
    setResult(null);
    try {
      setResult(await importPois.mutateAsync(file));
    } catch {
      setImportError("Couldn't read this file. Use a .csv, .json, or .geojson export.");
    }
  }

  async function onExport() {
    setExporting(true);
    try {
      triggerDownload(await exportPois(), "minimalpoi-places.geojson");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(26,24,22,.42)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn .16s ease" }}>
      <div role="dialog" aria-modal="true" aria-label="Data and backups" className="poi-scroll" style={{ width: 660, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: theme.radius.modal, boxShadow: theme.shadow.modal, animation: "popIn .2s ease" }}>
        <div style={{ position: "sticky", top: 0, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", zIndex: 2 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>Data &amp; backups</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 30, height: 30, borderRadius: theme.radius.icon, border: "none", background: "#f5f4f2", color: theme.color.textSecondary, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "0 24px 24px" }}>
          <div style={sectionCard}>
            <div>
              <div style={rowLabel}>Import places</div>
              <p style={rowHint}>Upload a GeoJSON or CSV file. Likely duplicates are skipped.</p>
            </div>
            <div>
              <input ref={fileRef} id="data-import-file" type="file" accept=".json,.geojson,.csv" onChange={onFile} style={{ display: "none" }} />
              <label htmlFor="data-import-file" style={{ ...ghostButtonStyle, display: "inline-block" }}>
                {importPois.isPending ? "Importing…" : "Choose file"}
              </label>
            </div>
            {importError && (
              <div role="alert" style={{ fontSize: 12.5, color: theme.color.dangerText }}>{importError}</div>
            )}
            {result && (
              <div role="status" style={{ fontSize: 12.5, color: theme.color.textBody }}>
                <div style={{ fontWeight: 700 }}>{result.created} added · {result.skipped} skipped (duplicates)</div>
                {result.errors.length > 0 && (
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: theme.color.textSecondary }}>
                    {result.errors.map((er) => (
                      <li key={er.row}>row {er.row}: {er.reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div style={{ borderTop: `1px solid ${theme.color.borderSubtle}`, paddingTop: 14 }}>
              <div style={rowLabel}>Export places</div>
              <p style={rowHint}>Download all your places as a GeoJSON backup.</p>
              <button type="button" onClick={onExport} disabled={exporting} style={{ ...primaryButtonStyle, marginTop: 10, opacity: exporting ? 0.6 : 1 }}>
                {exporting ? "Exporting…" : "Export GeoJSON"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
