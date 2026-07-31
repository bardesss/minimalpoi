import { useState } from "react";
import type { PoiDraft } from "../../types/api";
import { ghostButtonStyle, inputStyle, theme, fieldLabelStyle } from "../../theme";


// The "enrich from URL" sub-flow. Owns the URL text, in-flight flag and its own
// error, so typing or retrying here doesn't re-render the main form. The
// resulting draft is handed up via onApplyDraft, because it writes the shared
// name/address/coords/image fields and the provenance banner.
export function EnrichSection({
  onEnrich,
  onApplyDraft,
  filledCount,
  enrichHost,
}: {
  onEnrich: (url: string) => Promise<PoiDraft>;
  onApplyDraft: (draft: PoiDraft, sourceHost: string | null) => void;
  filledCount: number;
  enrichHost: string | null;
}) {
  const [enrichUrlText, setEnrichUrlText] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  async function runEnrich() {
    if (enrichUrlText.trim() === "") return;
    setEnriching(true);
    setEnrichError(null);
    try {
      const draft = await onEnrich(enrichUrlText.trim());
      let host: string | null = null;
      try {
        host = new URL(enrichUrlText.trim()).host;
      } catch {
        host = null;
      }
      onApplyDraft(draft, host);
    } catch {
      setEnrichError("Couldn't read that link — fill the form manually.");
    } finally {
      setEnriching(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={fieldLabelStyle} htmlFor="poi-enrich-url">Enrich from URL</label>
      <div style={{ display: "flex", gap: 8 }}>
        {/* Rendered inside the parent <form>, so Enter must be swallowed here
            or it would submit the form instead of running enrichment. */}
        <input
          id="poi-enrich-url"
          style={inputStyle}
          value={enrichUrlText}
          onChange={(e) => setEnrichUrlText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runEnrich(); } }}
          placeholder="Paste a Google Maps or website link"
        />
        <button type="button" onClick={runEnrich} disabled={enriching} style={{ ...ghostButtonStyle, whiteSpace: "nowrap" }}>{enriching ? "Enriching…" : "Enrich"}</button>
      </div>
      {enrichError && <div role="status" style={{ fontSize: 12, color: theme.color.dangerText }}>{enrichError}</div>}
      {filledCount > 0 && enrichHost && (
        <div role="status" style={{ fontSize: 12, color: theme.color.deepIndigoText, background: theme.color.tintBg, border: `1px solid ${theme.color.tintBorder}`, borderRadius: theme.radius.input, padding: "8px 10px" }}>
          Filled {filledCount} fields from {enrichHost} — review before saving.
        </div>
      )}
    </div>
  );
}
