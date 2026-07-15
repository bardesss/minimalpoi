import { useState } from "react";
import type { PoiCreate, PoiDraft, RouteNodeCreate, RouteNodeKind } from "../../types/api";
import { ghostButtonStyle, inputStyle, primaryButtonStyle, theme } from "../../theme";
import { usePois } from "../../queries/hooks";

export function toPoiCreate(draft: PoiDraft): PoiCreate {
  return {
    name: draft.name ?? "",
    lat: draft.lat as number,
    lng: draft.lng as number,
    address: draft.address,
    city: draft.city,
    country_code: draft.country_code,
    category_id: null,
    tags: [],
    notes: draft.description,
    phone: draft.phone,
    website: draft.website,
    image_url: draft.image_url,
    source_url: draft.source_url,
  };
}

export default function NodePicker({
  kind,
  onCancel,
  onSubmit,
}: {
  kind: RouteNodeKind;
  onCancel: () => void;
  onSubmit: (body: RouteNodeCreate) => void;
}) {
  const poisQuery = usePois();
  const [search, setSearch] = useState("");
  const [manual, setManual] = useState(false);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const nights = kind === "stay" ? 1 : null;
  const pois = (poisQuery.data ?? []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  function pickPoi(poiId: number) {
    onSubmit({ kind, poi_id: poiId, nights });
  }
  function addManual() {
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!name.trim() || Number.isNaN(latN) || Number.isNaN(lngN)) return;
    onSubmit({ kind, name: name.trim(), lat: latN, lng: lngN, nights });
  }

  return (
    <div style={{ border: `1px solid ${theme.color.borderStd}`, borderRadius: theme.radius.card, padding: 12, background: theme.color.pageBg }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <strong style={{ fontFamily: theme.font.ui, fontSize: 13 }}>Add {kind}</strong>
        <button type="button" aria-label="Cancel" style={{ ...ghostButtonStyle, padding: "4px 10px" }} onClick={onCancel}>Cancel</button>
      </div>

      {manual ? (
        <div style={{ display: "grid", gap: 8 }}>
          <input aria-label="Point name" placeholder="Name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <input aria-label="Latitude" placeholder="Latitude" style={inputStyle} value={lat} onChange={(e) => setLat(e.target.value)} />
            <input aria-label="Longitude" placeholder="Longitude" style={inputStyle} value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={primaryButtonStyle} onClick={addManual}>Add point</button>
            <button type="button" style={ghostButtonStyle} onClick={() => setManual(false)}>Pick a place instead</button>
          </div>
        </div>
      ) : (
        <div>
          <input aria-label="Search places" placeholder="Search places…" style={{ ...inputStyle, marginBottom: 8 }} value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="poi-scroll" style={{ maxHeight: 180, overflowY: "auto", display: "grid", gap: 4 }}>
            {pois.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPoi(p.id)}
                style={{ textAlign: "left", padding: "8px 10px", borderRadius: theme.radius.input, border: `1px solid ${theme.color.borderSubtle}`, background: theme.color.surface0, cursor: "pointer", fontFamily: theme.font.ui, fontSize: 13, color: theme.color.textPrimary }}
              >
                {p.name}
              </button>
            ))}
            {pois.length === 0 && <p style={{ margin: 0, fontSize: 12.5, color: theme.color.textPlaceholder }}>No matching places.</p>}
          </div>
          <button type="button" style={{ ...ghostButtonStyle, marginTop: 8 }} onClick={() => setManual(true)}>Add a point manually</button>
        </div>
      )}
    </div>
  );
}
