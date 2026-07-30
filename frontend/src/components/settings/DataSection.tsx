import { useState, type ChangeEvent } from "react";
import { useImportPois, useRestoreBackup } from "../../queries/hooks";
import { exportPois } from "../../api/portability";
import { downloadBackup } from "../../api/backup";
import { triggerDownload } from "../../lib/download";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { ImportResult } from "../../types/api";
import { ghostButtonStyle, inputStyle, primaryButtonStyle, theme } from "../../theme";

const rowLabel = { fontSize: 13, fontWeight: 800, letterSpacing: "-.01em" } as const;
const rowHint = { margin: "2px 0 0", fontSize: 12, color: theme.color.textSecondary } as const;

export default function DataSection() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const importPois = useImportPois();
  const restore = useRestoreBackup();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [restoreSummary, setRestoreSummary] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

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

  async function onDownloadBackup() {
    setBackingUp(true);
    try {
      triggerDownload(await downloadBackup(), "minimalpoi-backup.zip");
    } finally {
      setBackingUp(false);
    }
  }

  function onPickRestoreFile(e: ChangeEvent<HTMLInputElement>) {
    setRestoreSummary(null);
    setRestoreError(null);
    setRestoreFile(e.target.files?.[0] ?? null);
  }

  async function onRestore() {
    if (!restoreFile) return;
    setRestoreSummary(null);
    setRestoreError(null);
    try {
      const res = await restore.mutateAsync(restoreFile);
      const total = Object.values(res.restored).reduce((a, b) => a + b, 0);
      setRestoreSummary(`Restored ${total} records. Reload and sign in with the restored credentials.`);
      setRestoreFile(null);
      setConfirmText("");
    } catch (err) {
      setRestoreError(err instanceof ApiError ? err.message : "Restore failed — check the file is a MinimalPOI backup.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={rowLabel}>Import places</div>
        <p style={rowHint}>Upload a GeoJSON or CSV file. Likely duplicates are skipped.</p>
        <input id="data-import-file" type="file" accept=".json,.geojson,.csv" onChange={onFile} style={{ display: "none" }} />
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

      {isAdmin && (
        <div style={{ borderTop: `1px solid ${theme.color.borderSubtle}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={rowLabel}>Full backup</div>
            <p style={rowHint}>
              Download a complete archive of <em>all</em> data — places, photos, users, teams, comments, ratings and settings.
              The file contains secrets (password hashes, saved API keys); keep it private.
            </p>
            <button type="button" onClick={onDownloadBackup} disabled={backingUp} style={{ ...primaryButtonStyle, marginTop: 10, opacity: backingUp ? 0.6 : 1 }}>
              {backingUp ? "Preparing…" : "Download backup"}
            </button>
          </div>
          <div>
            <div style={rowLabel}>Restore from backup</div>
            <p style={rowHint}>
              Replaces everything from a backup archive. Only works on a <strong>fresh instance</strong> (no places yet).
              Type <code>RESTORE</code> to confirm.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, maxWidth: 360 }}>
              <input id="restore-file" type="file" accept=".zip,application/zip" aria-label="Choose backup file" onChange={onPickRestoreFile} style={{ fontSize: 12 }} />
              <label htmlFor="restore-confirm" style={{ fontSize: 12, fontWeight: 700, color: theme.color.textBody }}>Type RESTORE to confirm</label>
              <input id="restore-confirm" style={inputStyle} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESTORE" />
              <button
                type="button"
                onClick={onRestore}
                disabled={!restoreFile || confirmText !== "RESTORE" || restore.isPending}
                style={{ ...primaryButtonStyle, opacity: !restoreFile || confirmText !== "RESTORE" || restore.isPending ? 0.5 : 1 }}
              >
                {restore.isPending ? "Restoring…" : "Restore now"}
              </button>
            </div>
            {restoreError && <div role="alert" style={{ fontSize: 12.5, color: theme.color.dangerText, marginTop: 8 }}>{restoreError}</div>}
            {restoreSummary && <div role="status" style={{ fontSize: 12.5, color: theme.color.textBody, marginTop: 8, fontWeight: 700 }}>{restoreSummary}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
