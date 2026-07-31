import { useState } from "react";
import type { PlaceSelection } from "./placeSelection";
import { inputStyle, resultButtonStyle, theme } from "../../../theme";
import { usePois } from "../../../queries/hooks";

export default function SavedPlacePanel({ onPick }: { onPick: (sel: PlaceSelection) => void }) {
  const poisQuery = usePois();
  const [search, setSearch] = useState("");
  const pois = (poisQuery.data ?? []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <input aria-label="Search places" placeholder="Search places…" style={{ ...inputStyle, marginBottom: 8 }} value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="poi-scroll" style={{ maxHeight: 220, overflowY: "auto", display: "grid", gap: 4 }}>
        {pois.map((p) => (
          <button key={p.id} type="button" onClick={() => onPick({ poi_id: p.id })} style={{ ...resultButtonStyle, fontFamily: theme.font.ui, fontSize: 13, color: theme.color.textPrimary }}>
            {p.name}
          </button>
        ))}
        {pois.length === 0 && <p style={{ margin: 0, fontSize: 12.5, color: theme.color.textPlaceholder }}>No matching places.</p>}
      </div>
    </div>
  );
}
