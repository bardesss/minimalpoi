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
  const [baseUrl, setBaseUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [interval, setIntervalSecs] = useState("300");
  const [policy, setPolicy] = useState("minimalpoi_wins");
  const [googleKey, setGoogleKey] = useState("");
  const [nominatim, setNominatim] = useState("");

  useEffect(() => {
    if (!s) return;
    setBaseUrl(s.trip_base_url ?? "");
    setUsername(s.trip_username ?? "");
    setSyncEnabled(s.trip_sync_enabled);
    setIntervalSecs(String(s.trip_sync_interval_seconds));
    setPolicy(s.trip_conflict_policy);
    setNominatim(s.nominatim_url ?? "");
  }, [s]);

  if (!s) return <p style={{ fontSize: 13, color: theme.color.textSecondary }}>Loading…</p>;

  async function submit() {
    const patch: SettingsUpdate = {
      trip_base_url: nn(baseUrl),
      trip_username: nn(username),
      trip_sync_enabled: syncEnabled,
      trip_sync_interval_seconds: Number(interval) || 300,
      trip_conflict_policy: policy,
      nominatim_url: nn(nominatim),
    };
    if (password !== "") patch.trip_password = password;
    if (googleKey !== "") patch.google_api_key = googleKey;
    try {
      await update.mutateAsync(patch);
      setPassword("");
      setGoogleKey("");
      notify("Connections saved");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed", "error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><label style={fieldLabelStyle} htmlFor="c-base">TRIP base URL</label><input id="c-base" style={inputStyle} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://trip.example" /></div>
      <div><label style={fieldLabelStyle} htmlFor="c-user">TRIP username</label><input id="c-user" style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} /></div>
      <div>
        <label style={fieldLabelStyle} htmlFor="c-pass">TRIP password <span style={{ color: theme.color.textPlaceholder, fontWeight: 500 }}>({s.trip_password_set ? "set" : "not set"})</span></label>
        <input id="c-pass" type="password" style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter to change" />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
          <input type="checkbox" checked={syncEnabled} onChange={(e) => setSyncEnabled(e.target.checked)} /> Sync enabled
        </label>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}><label style={fieldLabelStyle} htmlFor="c-int">Sync interval (s)</label><input id="c-int" style={inputStyle} value={interval} onChange={(e) => setIntervalSecs(e.target.value)} /></div>
        <div style={{ flex: 1 }}>
          <label style={fieldLabelStyle} htmlFor="c-policy">Conflict policy</label>
          <select id="c-policy" style={inputStyle} value={policy} onChange={(e) => setPolicy(e.target.value)}>
            <option value="minimalpoi_wins">MinimalPOI wins</option>
            <option value="trip_wins">TRIP wins</option>
          </select>
        </div>
      </div>
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
