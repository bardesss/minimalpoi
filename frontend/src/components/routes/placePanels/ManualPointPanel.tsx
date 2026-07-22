import { useState } from "react";
import type { PlaceSelection } from "./placeSelection";
import { inputStyle, primaryButtonStyle } from "../../../theme";

export default function ManualPointPanel({ onPick }: { onPick: (sel: PlaceSelection) => void }) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  function add() {
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!name.trim() || Number.isNaN(latN) || Number.isNaN(lngN)) return;
    onPick({ name: name.trim(), lat: latN, lng: lngN });
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input aria-label="Point name" placeholder="Name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
      <div style={{ display: "flex", gap: 8 }}>
        <input aria-label="Latitude" placeholder="Latitude" style={inputStyle} value={lat} onChange={(e) => setLat(e.target.value)} />
        <input aria-label="Longitude" placeholder="Longitude" style={inputStyle} value={lng} onChange={(e) => setLng(e.target.value)} />
      </div>
      <button type="button" style={primaryButtonStyle} onClick={add}>Add point</button>
    </div>
  );
}
