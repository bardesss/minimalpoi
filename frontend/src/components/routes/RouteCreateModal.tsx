import { useState } from "react";
import type { RouteDetail, RouteNodeCreate } from "../../types/api";
import { ApiError } from "../../api/client";
import { ghostButtonStyle, inputStyle, primaryButtonStyle, theme } from "../../theme";
import { useIsMobile } from "../../lib/useMediaQuery";
import { useCreateRoutePlan, usePois } from "../../queries/hooks";
import NodePicker from "./NodePicker";

const label = { fontSize: 12, fontWeight: 700, color: theme.color.textBody, marginBottom: 6, display: "block" } as const;
const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" } as const;

/** Human label for a chosen start/end place — a saved place name, or the ad-hoc point's name. */
function pointLabel(body: RouteNodeCreate, poiName: (id: number) => string | undefined): string {
  if (body.poi_id != null) return poiName(body.poi_id) ?? "Saved place";
  return body.name ?? "Point";
}

export default function RouteCreateModal({
  teams,
  onClose,
  onCreated,
}: {
  teams: { id: number; name: string }[];
  onClose: () => void;
  onCreated: (route: RouteDetail) => void;
}) {
  const isMobile = useIsMobile();
  const createPlan = useCreateRoutePlan();
  const pois = usePois().data ?? [];
  const poiName = (id: number) => pois.find((p) => p.id === id)?.name;

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [teamId, setTeamId] = useState("");
  const [roundTrip, setRoundTrip] = useState(true);
  const [startBody, setStartBody] = useState<RouteNodeCreate | null>(null);
  const [endBody, setEndBody] = useState<RouteNodeCreate | null>(null);
  const [picking, setPicking] = useState<"start" | "end" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canCreate =
    name.trim() !== "" && startDate !== "" && startBody != null && (roundTrip || endBody != null);

  async function create() {
    if (!canCreate || startBody == null) return;
    setError(null);
    try {
      const route = await createPlan.mutateAsync({
        route: {
          name: name.trim(),
          start_date: startDate,
          ...(endDate ? { end_date: endDate } : {}),
          ...(teamId ? { team_id: Number(teamId) } : {}),
        },
        start: startBody,
        end: roundTrip ? null : endBody,
      });
      onCreated(route);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the route — please try again.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New route"
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(26,24,22,.42)", backdropFilter: "blur(2px)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", animation: "fadeIn .16s ease" }}
    >
      <div
        className="poi-scroll"
        style={{ width: isMobile ? "100%" : 520, maxWidth: "100%", maxHeight: isMobile ? "92vh" : "90vh", overflowY: "auto", background: "#fff", borderRadius: isMobile ? "18px 18px 0 0" : theme.radius.modal, paddingBottom: isMobile ? "env(safe-area-inset-bottom)" : undefined, boxShadow: theme.shadow.modal, animation: isMobile ? "sheetUp .26s cubic-bezier(.32,.72,0,1)" : "popIn .2s ease" }}
      >
        <div style={{ position: "sticky", top: 0, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", zIndex: 2 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>New route</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 30, height: 30, borderRadius: theme.radius.icon, border: "none", background: "#f5f4f2", color: theme.color.textSecondary, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "0 24px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={label} htmlFor="route-name">Name</label>
            <input id="route-name" aria-label="Route name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alps loop" />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="route-start">Start date</label>
              <input id="route-start" aria-label="Start date" type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="route-end">End date (optional)</label>
              <input id="route-end" aria-label="End date (optional)" type="date" style={inputStyle} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {teams.length > 0 && (
            <div>
              <label style={label} htmlFor="route-team">Team (optional)</label>
              <select id="route-team" aria-label="Team (optional)" style={inputStyle} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                <option value="">No team</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <p style={sectionLabel}>Start place</p>
            {picking === "start" ? (
              <NodePicker kind="stop" role="start" onCancel={() => setPicking(null)} onSubmit={(b) => { setStartBody(b); setPicking(null); }} />
            ) : startBody ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderRadius: theme.radius.input, border: `1px solid ${theme.color.borderCard}`, background: theme.color.surface0 }}>
                <span style={{ fontFamily: theme.font.ui, fontSize: 13, fontWeight: 700, color: theme.color.textPrimary }}>▶ {pointLabel(startBody, poiName)}</span>
                <button type="button" style={{ ...ghostButtonStyle, padding: "4px 10px" }} onClick={() => setPicking("start")}>Change</button>
              </div>
            ) : (
              <button type="button" style={{ ...ghostButtonStyle, padding: "6px 12px" }} onClick={() => setPicking("start")}>+ Set start place</button>
            )}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: theme.color.textBody }}>
            <input type="checkbox" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />
            Round trip (end where you start)
          </label>

          {!roundTrip && (
            <div>
              <p style={sectionLabel}>End place</p>
              {picking === "end" ? (
                <NodePicker kind="stop" role="end" onCancel={() => setPicking(null)} onSubmit={(b) => { setEndBody(b); setPicking(null); }} />
              ) : endBody ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderRadius: theme.radius.input, border: `1px solid ${theme.color.borderCard}`, background: theme.color.surface0 }}>
                  <span style={{ fontFamily: theme.font.ui, fontSize: 13, fontWeight: 700, color: theme.color.textPrimary }}>■ {pointLabel(endBody, poiName)}</span>
                  <button type="button" style={{ ...ghostButtonStyle, padding: "4px 10px" }} onClick={() => setPicking("end")}>Change</button>
                </div>
              ) : (
                <button type="button" style={{ ...ghostButtonStyle, padding: "6px 12px" }} onClick={() => setPicking("end")}>+ Set end place</button>
              )}
            </div>
          )}
        </div>

        <div style={{ position: "sticky", bottom: 0, background: "#fff", display: "flex", flexDirection: "column", gap: 8, padding: "14px 24px 22px" }}>
          {error && <div role="alert" style={{ fontSize: 12.5, color: theme.color.dangerText, textAlign: "right" }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={onClose} style={ghostButtonStyle}>Cancel</button>
            <button type="button" onClick={create} disabled={!canCreate || createPlan.isPending} style={primaryButtonStyle}>{createPlan.isPending ? "Creating…" : "Create route"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
