import { useEffect, useState } from "react";
import { useFullSettings, useUpdateSettings } from "../../queries/hooks";
import { useToast } from "../Toast";
import type { SettingsUpdate } from "../../types/api";
import { inputStyle, primaryButtonStyle, theme, fieldLabelStyle } from "../../theme";

const nn = (s: string) => (s.trim() === "" ? null : s.trim());

export default function ConnectionsSection() {
  const settings = useFullSettings();
  const update = useUpdateSettings();
  const { notify } = useToast();
  const s = settings.data;
  const [googleKey, setGoogleKey] = useState("");
  const [nominatim, setNominatim] = useState("");

  useEffect(() => {
    if (!s) return;
    setNominatim(s.nominatim_url ?? "");
  }, [s]);

  if (!s) return <p style={{ fontSize: 13, color: theme.color.textSecondary }}>Loading…</p>;

  async function submit() {
    const patch: SettingsUpdate = { nominatim_url: nn(nominatim) };
    if (googleKey !== "") patch.google_api_key = googleKey;
    try {
      await update.mutateAsync(patch);
      setGoogleKey("");
      notify("Connections saved");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed", "error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={fieldLabelStyle} htmlFor="c-gkey">Google API key <span style={{ color: theme.color.textPlaceholder, fontWeight: 500 }}>({s.google_api_key_set ? "set" : "not set"})</span></label>
        <input id="c-gkey" type="password" style={inputStyle} value={googleKey} onChange={(e) => setGoogleKey(e.target.value)} placeholder="Enter to change" />
      </div>
      <div><label style={fieldLabelStyle} htmlFor="c-nom">Nominatim URL</label><input id="c-nom" style={inputStyle} value={nominatim} onChange={(e) => setNominatim(e.target.value)} /></div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={submit} disabled={update.isPending} style={primaryButtonStyle}>{update.isPending ? "Saving…" : "Save connections"}</button>
      </div>
    </div>
  );
}
