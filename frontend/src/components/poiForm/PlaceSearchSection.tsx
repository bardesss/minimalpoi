import { useState } from "react";
import type { PlaceSearchResult, PoiDraft } from "../../types/api";
import { ghostButtonStyle, inputStyle, theme, fieldLabelStyle } from "../../theme";


// The Google Places search sub-flow. Owns the query text, in-flight flag,
// error and result list, so searching and browsing results doesn't re-render
// the main form. Picking a result hands the resolved draft up via onApplyDraft.
export function PlaceSearchSection({
  onSearchPlaces,
  onPickPlace,
  onApplyDraft,
}: {
  onSearchPlaces: (query: string) => Promise<PlaceSearchResult[]>;
  onPickPlace?: (placeId: string) => Promise<PoiDraft>;
  onApplyDraft: (draft: PoiDraft, source: string) => void;
}) {
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<PlaceSearchResult[]>([]);

  async function runSearch() {
    if (searchText.trim() === "") return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const found = await onSearchPlaces(searchText.trim());
      setResults(found);
      if (found.length === 0) setSearchError("No matching places found.");
    } catch {
      setSearchError("Search failed — add a Google API key in Settings, or fill the form manually.");
    } finally {
      setSearching(false);
    }
  }

  async function pickPlace(result: PlaceSearchResult) {
    if (!onPickPlace) return;
    setSearchError(null);
    setResults([]);
    setSearchText("");
    try {
      const draft = await onPickPlace(result.place_id);
      onApplyDraft(draft, "Google Places");
    } catch {
      setSearchError("Couldn't load that place — try another or fill the form manually.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={fieldLabelStyle} htmlFor="poi-place-search">Search places</label>
      <div style={{ display: "flex", gap: 8 }}>
        {/* Rendered inside the parent <form>, so Enter must be swallowed here
            or it would submit the form instead of running the search. */}
        <input
          id="poi-place-search"
          style={inputStyle}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(); } }}
          placeholder="Search Google Places by name"
        />
        <button type="button" onClick={runSearch} disabled={searching} style={{ ...ghostButtonStyle, whiteSpace: "nowrap" }}>{searching ? "Searching…" : "Search"}</button>
      </div>
      {searchError && <div role="status" style={{ fontSize: 12, color: theme.color.dangerText }}>{searchError}</div>}
      {results.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto", border: `1px solid ${theme.color.borderCard}`, borderRadius: theme.radius.input }}>
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                type="button"
                onClick={() => pickPlace(r)}
                style={{ width: "100%", textAlign: "left", padding: "8px 10px", background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: theme.color.textPrimary }}>{r.name}</span>
                {r.address && <span style={{ fontSize: 11.5, color: theme.color.textPlaceholder }}>{r.address}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
