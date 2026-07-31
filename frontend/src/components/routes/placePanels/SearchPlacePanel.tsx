import { useState } from "react";
import type { PlaceSearchResult, PoiCreate, PoiDraft } from "../../../types/api";
import type { PlaceSelection } from "./placeSelection";
import { ghostButtonStyle, inputStyle, primaryButtonStyle, resultButtonStyle, theme } from "../../../theme";
import { useCreatePoi, usePlaceDraft, useSearchPlaces } from "../../../queries/hooks";

function toPoiCreate(draft: PoiDraft): PoiCreate {
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

export default function SearchPlacePanel({ onPick }: { onPick: (sel: PlaceSelection) => void }) {
  const searchPlaces = useSearchPlaces();
  const placeDraft = usePlaceDraft();
  const createPoi = useCreatePoi();

  const [gQuery, setGQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [selected, setSelected] = useState<PoiDraft | null>(null);
  const [alsoSave, setAlsoSave] = useState(false);
  const [gError, setGError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runSearch() {
    if (gQuery.trim() === "") return;
    setBusy(true);
    setGError(null);
    setResults([]);
    setSelected(null);
    try {
      const found = await searchPlaces.mutateAsync(gQuery.trim());
      setResults(found);
      if (found.length === 0) setGError("No matching places found.");
    } catch {
      setGError("Search failed — add a Google API key in Settings, or fill the form manually.");
    } finally {
      setBusy(false);
    }
  }

  async function selectResult(r: PlaceSearchResult) {
    setBusy(true);
    setGError(null);
    try {
      const draft = await placeDraft.mutateAsync(r.place_id);
      setSelected(draft);
      setResults([]);
    } catch {
      setGError("Couldn't load that place — try another.");
    } finally {
      setBusy(false);
    }
  }

  async function addSelected() {
    if (!selected) return;
    if (selected.lat == null || selected.lng == null) {
      setGError("This place has no coordinates — pick another.");
      return;
    }
    setBusy(true);
    setGError(null);
    try {
      if (alsoSave) {
        const poi = await createPoi.mutateAsync(toPoiCreate(selected));
        onPick({ poi_id: poi.id });
      } else {
        onPick({ name: selected.name ?? "", lat: selected.lat, lng: selected.lng });
      }
    } catch {
      setGError("Couldn't add that place — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {selected ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontFamily: theme.font.ui, fontSize: 13, color: theme.color.textPrimary }}>
            <strong>{selected.name}</strong>
            {selected.address && <div style={{ fontSize: 11.5, color: theme.color.textPlaceholder }}>{selected.address}</div>}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: theme.color.textBody }}>
            <input type="checkbox" checked={alsoSave} onChange={(e) => setAlsoSave(e.target.checked)} />
            Also save to my places
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={primaryButtonStyle} onClick={addSelected} disabled={busy}>Add place</button>
            <button type="button" style={ghostButtonStyle} onClick={() => { setSelected(null); setAlsoSave(false); setGError(null); }}>Back to results</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              aria-label="Search Google"
              placeholder="Search Google Places…"
              style={inputStyle}
              value={gQuery}
              onChange={(e) => setGQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(); } }}
            />
            <button type="button" style={{ ...ghostButtonStyle, whiteSpace: "nowrap" }} onClick={runSearch} disabled={busy}>{busy ? "Searching…" : "Search"}</button>
          </div>
          {results.length > 0 && (
            <div className="poi-scroll" style={{ maxHeight: 220, overflowY: "auto", display: "grid", gap: 4 }}>
              {results.map((r) => (
                <button key={r.place_id} type="button" onClick={() => selectResult(r)} style={resultButtonStyle}>
                  <div style={{ fontFamily: theme.font.ui, fontSize: 13, color: theme.color.textPrimary }}>{r.name}</div>
                  {r.address && <div style={{ fontSize: 11.5, color: theme.color.textPlaceholder }}>{r.address}</div>}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {gError && <div role="status" style={{ fontSize: 12, color: theme.color.dangerText }}>{gError}</div>}
    </div>
  );
}
