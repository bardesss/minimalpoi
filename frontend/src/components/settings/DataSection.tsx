import { useRef, useState } from "react";
import { useImportPois } from "../../queries/hooks";
import { exportPois } from "../../api/portability";
import { triggerDownload } from "../../lib/download";
import type { ImportResult } from "../../types/api";
import { ghostButtonStyle, primaryButtonStyle, theme } from "../../theme";

const rowLabel = { fontSize: 13, fontWeight: 800, letterSpacing: "-.01em" } as const;
const rowHint = { margin: "2px 0 0", fontSize: 12, color: theme.color.textSecondary } as const;

export default function DataSection() {
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={rowLabel}>Import places</div>
        <p style={rowHint}>Upload a GeoJSON or CSV file. Likely duplicates are skipped.</p>
        <input ref={fileRef} id="data-import-file" type="file" accept=".json,.geojson,.csv" onChange={onFile} style={{ display: "none" }} />
        <label htmlFor="data-import-file" style={{ ...ghostButtonStyle, display: "inline-block", marginTop: 8 }}>
          {importPois.isPending ? "Importing…" : "Choose file"}
        </label>
        {importError && <div role="alert" style={{ fontSize: 12.5, color: theme.color.dangerText, marginTop: 8 }}>{importError}</div>}
        {result && (
          <div role="status" style={{ fontSize: 12.5, color: theme.color.textBody, marginTop: 8 }}>
            <div style={{ fontWeight: 700 }}>{result.created} added · {result.skipped} skipped (duplicates)</div>
            {result.errors.length > 0 && (
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: theme.color.textSecondary }}>
                {result.errors.map((er) => <li key={er.row}>row {er.row}: {er.reason}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
      <div style={{ borderTop: `1px solid ${theme.color.borderSubtle}`, paddingTop: 14 }}>
        <div style={rowLabel}>Export places</div>
        <p style={rowHint}>Download all your places as a GeoJSON backup.</p>
        <button type="button" onClick={onExport} disabled={exporting} style={{ ...primaryButtonStyle, marginTop: 10, opacity: exporting ? 0.6 : 1 }}>
          {exporting ? "Exporting…" : "Export GeoJSON"}
        </button>
      </div>
    </div>
  );
}
