import { useEffect, useState } from "react";
import { useFullSettings, useUpdateSettings } from "../../queries/hooks";
import type { SettingsUpdate } from "../../types/api";
import { inputStyle, primaryButtonStyle, theme } from "../../theme";

const label = { fontSize: 12, fontWeight: 700, color: theme.color.textBody, marginBottom: 6, display: "block" } as const;

export default function MapSection() {
  const settings = useFullSettings();
  const update = useUpdateSettings();
  const s = settings.data;
  const [tileUrl, setTileUrl] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [zoom, setZoom] = useState("");
  const [cookieSecure, setCookieSecure] = useState(false);

  useEffect(() => {
    if (!s) return;
    setTileUrl(s.map_tile_url);
    setLat(String(s.default_map_center_lat));
    setLng(String(s.default_map_center_lng));
    setZoom(String(s.default_map_zoom));
    setCookieSecure(s.cookie_secure);
  }, [s]);

  if (!s) return <p style={{ fontSize: 13, color: theme.color.textSecondary }}>Loading…</p>;

  function submit() {
    const patch: SettingsUpdate = {
      map_tile_url: tileUrl.trim(),
      default_map_center_lat: Number(lat),
      default_map_center_lng: Number(lng),
      default_map_zoom: Number(zoom),
      cookie_secure: cookieSecure,
    };
    update.mutate(patch);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><label style={label} htmlFor="m-tile">Map tile style URL</label><input id="m-tile" style={inputStyle} value={tileUrl} onChange={(e) => setTileUrl(e.target.value)} /></div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}><label style={label} htmlFor="m-lat">Default center lat</label><input id="m-lat" style={inputStyle} value={lat} onChange={(e) => setLat(e.target.value)} /></div>
        <div style={{ flex: 1 }}><label style={label} htmlFor="m-lng">Default center lng</label><input id="m-lng" style={inputStyle} value={lng} onChange={(e) => setLng(e.target.value)} /></div>
        <div style={{ flex: 1 }}><label style={label} htmlFor="m-zoom">Default zoom</label><input id="m-zoom" style={inputStyle} value={zoom} onChange={(e) => setZoom(e.target.value)} /></div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
        <input type="checkbox" checked={cookieSecure} onChange={(e) => setCookieSecure(e.target.checked)} /> Secure cookie (enable behind HTTPS)
      </label>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={submit} disabled={update.isPending} style={primaryButtonStyle}>{update.isPending ? "Saving…" : "Save map settings"}</button>
      </div>
    </div>
  );
}
