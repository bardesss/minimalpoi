import { useState } from "react";
import type { RouteNodeCreate, RouteNodeKind, RouteNodeRole } from "../../types/api";
import { ghostButtonStyle, inputStyle, theme } from "../../theme";
import ModalShell from "./ModalShell";
import SavedPlacePanel from "./placePanels/SavedPlacePanel";
import SearchPlacePanel from "./placePanels/SearchPlacePanel";
import ManualPointPanel from "./placePanels/ManualPointPanel";
import type { PlaceSelection } from "./placePanels/placeSelection";


type Method = "saved" | "search" | "manual";

const methodLabel: Record<Method, string> = {
  saved: "Saved place",
  search: "Search a place",
  manual: "Enter coordinates",
};

const chooserBtn = {
  textAlign: "left" as const,
  padding: "12px 14px",
  borderRadius: theme.radius.input,
  border: `1px solid ${theme.color.borderCard}`,
  background: theme.color.surface0,
  cursor: "pointer",
  fontFamily: theme.font.ui,
  fontWeight: 700,
  fontSize: 14,
  color: theme.color.textPrimary,
};

export default function AddPlaceModal({
  kind,
  role,
  onSubmit,
  onClose,
}: {
  kind: RouteNodeKind;
  role?: RouteNodeRole | null;
  onSubmit: (body: RouteNodeCreate) => void;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<Method | null>(null);
  const [nights, setNights] = useState(1);

  const title =
    role === "start" ? "Set start place"
    : role === "end" ? "Set end place"
    : kind === "stay" ? "Add stay"
    : "Add stop";

  function pick(sel: PlaceSelection) {
    onSubmit({ kind, ...(role ? { role } : {}), ...sel, nights: kind === "stay" ? nights : null });
  }

  return (
    <ModalShell label={title} onClose={onClose} mobileSheet desktopWidth={480} zIndex={2100} cardClassName="poi-scroll">
        <div style={{ position: "sticky", top: 0, background: "#fff", display: "flex", alignItems: "center", gap: 8, padding: "18px 20px 14px", zIndex: 2 }}>
          {method !== null && (
            <button type="button" aria-label="Back" onClick={() => setMethod(null)} style={{ ...ghostButtonStyle, padding: "4px 10px" }}>←</button>
          )}
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-.02em", flex: 1 }}>{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 30, height: 30, borderRadius: theme.radius.icon, border: "none", background: "#f5f4f2", color: theme.color.textSecondary, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "0 20px 20px", display: "grid", gap: 10 }}>
          {kind === "stay" && method !== null && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: theme.color.textBody }}>
              Nights
              <input
                aria-label="Nights"
                type="number"
                min={0}
                style={{ ...inputStyle, width: 80 }}
                value={nights}
                onChange={(e) => setNights(Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
          )}

          {method === null ? (
            <div style={{ display: "grid", gap: 8 }}>
              {(Object.keys(methodLabel) as Method[]).map((m) => (
                <button key={m} type="button" style={chooserBtn} onClick={() => setMethod(m)}>{methodLabel[m]}</button>
              ))}
            </div>
          ) : method === "saved" ? (
            <SavedPlacePanel onPick={pick} />
          ) : method === "search" ? (
            <SearchPlacePanel onPick={pick} />
          ) : (
            <ManualPointPanel onPick={pick} />
          )}
        </div>
    </ModalShell>
  );
}
