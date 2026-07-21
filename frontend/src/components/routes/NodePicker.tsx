import { useState } from "react";
import type { PlaceSearchResult, PoiCreate, PoiDraft, RouteNodeCreate, RouteNodeKind, RouteNodeRole } from "../../types/api";
import { ghostButtonStyle, inputStyle, primaryButtonStyle, theme } from "../../theme";
import { useCreatePoi, usePlaceDraft, usePois, useSearchPlaces } from "../../queries/hooks";

type PickerMode = "pick" | "manual" | "google";

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
  role,
  onCancel,
  onSubmit,
}: {
  kind: RouteNodeKind;
  role?: RouteNodeRole | null;
  onCancel: () => void;
  onSubmit: (body: RouteNodeCreate) => void;
}) {
  const poisQuery = usePois();
  const searchPlaces = useSearchPlaces();
  const placeDraft = usePlaceDraft();
  const createPoi = useCreatePoi();

  const [mode, setMode] = useState<PickerMode>("pick");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const [gQuery, setGQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [selected, setSelected] = useState<PoiDraft | null>(null);
  const [alsoSave, setAlsoSave] = useState(false);
  const [gError, setGError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nights = kind === "stay" ? 1 : null;
  const pois = (poisQuery.data ?? []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  function pickPoi(poiId: number) {
    onSubmit({ kind, ...(role ? { role } : {}), poi_id: poiId, nights });
  }
  function backToPick() {
    setSelected(null);
    setResults([]);
    setAlsoSave(false);
    setGError(null);
    setGQuery("");
    setMode("pick");
  }
  function addManual() {
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!name.trim() || Number.isNaN(latN) || Number.isNaN(lngN)) return;
    onSubmit({ kind, ...(role ? { role } : {}), name: name.trim(), lat: latN, lng: lngN, nights });
  }

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
        onSubmit({ kind, ...(role ? { role } : {}), poi_id: poi.id, nights });
      } else {
        onSubmit({ kind, ...(role ? { role } : {}), name: selected.name ?? "", lat: selected.lat, lng: selected.lng, nights });
      }
    } catch {
      setGError("Couldn't add that place — try again.");
    } finally {
      setBusy(false);
    }
  }

  const resultBtn = {
    textAlign: "left" as const,
    padding: "8px 10px",
    borderRadius: theme.radius.input,
    border: `1px solid ${theme.color.borderSubtle}`,
    background: theme.color.surface0,
    cursor: "pointer",
  };

  return (
    <div style={{ border: `1px solid ${theme.color.borderStd}`, borderRadius: theme.radius.card, padding: 12, background: theme.color.pageBg }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <strong style={{ fontFamily: theme.font.ui, fontSize: 13 }}>Add {kind}</strong>
        <button type="button" aria-label="Cancel" style={{ ...ghostButtonStyle, padding: "4px 10px" }} onClick={onCancel}>Cancel</button>
      </div>

      {mode === "manual" ? (
        <div style={{ display: "grid", gap: 8 }}>
          <input aria-label="Point name" placeholder="Name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <input aria-label="Latitude" placeholder="Latitude" style={inputStyle} value={lat} onChange={(e) => setLat(e.target.value)} />
            <input aria-label="Longitude" placeholder="Longitude" style={inputStyle} value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={primaryButtonStyle} onClick={addManual}>Add point</button>
            <button type="button" style={ghostButtonStyle} onClick={backToPick}>Pick a saved place instead</button>
          </div>
        </div>
      ) : mode === "google" ? (
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
                <button type="button" style={primaryButtonStyle} onClick={addSelected} disabled={busy}>Add {kind}</button>
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
                <div className="poi-scroll" style={{ maxHeight: 180, overflowY: "auto", display: "grid", gap: 4 }}>
                  {results.map((r) => (
                    <button key={r.place_id} type="button" onClick={() => selectResult(r)} style={resultBtn}>
                      <div style={{ fontFamily: theme.font.ui, fontSize: 13, color: theme.color.textPrimary }}>{r.name}</div>
                      {r.address && <div style={{ fontSize: 11.5, color: theme.color.textPlaceholder }}>{r.address}</div>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {gError && <div role="status" style={{ fontSize: 12, color: theme.color.dangerText }}>{gError}</div>}
          <button type="button" style={ghostButtonStyle} onClick={backToPick}>Pick a saved place instead</button>
        </div>
      ) : (
        <div>
          <input aria-label="Search places" placeholder="Search places…" style={{ ...inputStyle, marginBottom: 8 }} value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="poi-scroll" style={{ maxHeight: 180, overflowY: "auto", display: "grid", gap: 4 }}>
            {pois.map((p) => (
              <button key={p.id} type="button" onClick={() => pickPoi(p.id)} style={{ ...resultBtn, fontFamily: theme.font.ui, fontSize: 13, color: theme.color.textPrimary }}>
                {p.name}
              </button>
            ))}
            {pois.length === 0 && <p style={{ margin: 0, fontSize: 12.5, color: theme.color.textPlaceholder }}>No matching places.</p>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" style={ghostButtonStyle} onClick={() => setMode("google")}>Search Google</button>
            <button type="button" style={ghostButtonStyle} onClick={() => setMode("manual")}>Add a point manually</button>
          </div>
        </div>
      )}
    </div>
  );
}
