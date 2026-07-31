import { useState } from "react";
import type { RouteDetail, RouteNodeCreate } from "../../types/api";
import { ApiError } from "../../api/client";
import { ghostButtonStyle, inputStyle, primaryButtonStyle, theme, fieldLabelStyle } from "../../theme";
import { useIsMobile } from "../../lib/useMediaQuery";
import { useCreateRoutePlan, useUpdateRoutePlan, usePois } from "../../queries/hooks";
import AddPlaceModal from "./AddPlaceModal";
import ModalShell from "./ModalShell";

const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" } as const;

/** Human label for a chosen start/end place — a saved place name, or the ad-hoc point's name. */
function pointLabel(body: RouteNodeCreate, poiName: (id: number) => string | undefined): string {
  if (body.poi_id != null) return poiName(body.poi_id) ?? "Saved place";
  return body.name ?? "Point";
}

export default function RouteFormModal({
  teams,
  existing,
  onClose,
  onSaved,
}: {
  teams: { id: number; name: string }[];
  existing?: RouteDetail | null;
  onClose: () => void;
  onSaved: (route: RouteDetail) => void;
}) {
  const isMobile = useIsMobile();
  const createPlan = useCreateRoutePlan();
  const updatePlan = useUpdateRoutePlan();
  const pois = usePois().data ?? [];
  const poiName = (id: number) => pois.find((p) => p.id === id)?.name;

  const editing = existing != null;
  const startNode = existing?.nodes.find((n) => n.role === "start") ?? null;
  const endNode = existing?.nodes.find((n) => n.role === "end") ?? null;

  const [name, setName] = useState(existing?.name ?? "");
  const [startDate, setStartDate] = useState(existing?.start_date ?? "");
  const [endDate, setEndDate] = useState(existing?.end_date ?? "");
  const [teamId, setTeamId] = useState(existing?.team_id != null ? String(existing.team_id) : "");
  const [roundTrip, setRoundTrip] = useState(existing?.round_trip ?? true);
  // Bookends start "clean": null means unchanged. A display label comes from the node.
  const [startBody, setStartBody] = useState<RouteNodeCreate | null>(null);
  const [endBody, setEndBody] = useState<RouteNodeCreate | null>(null);
  const [picking, setPicking] = useState<"start" | "end" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startLabel = startBody ? pointLabel(startBody, poiName) : startNode?.name ?? null;
  const endLabel = endBody ? pointLabel(endBody, poiName) : endNode?.name ?? null;

  // Ensure the route's current team is representable in the select even if it's
  // no longer in the caller's `teams` list (e.g. team was removed from the user's set).
  const teamOptions =
    existing?.team_id != null && !teams.some((t) => t.id === existing.team_id)
      ? [...teams, { id: existing.team_id, name: existing.team_name ?? `Team ${existing.team_id}` }]
      : teams;

  const canSave = name.trim() !== "" && startDate !== ""
    && (editing ? (startNode != null || startBody != null) : startBody != null)
    && (roundTrip || (editing ? (endNode != null || endBody != null) : endBody != null));

  async function save() {
    if (!canSave) return;
    setError(null);
    try {
      const route = { name: name.trim(), ...(endDate ? { end_date: endDate } : { end_date: null }), ...(teamId ? { team_id: Number(teamId) } : { team_id: null }) };
      if (editing) {
        const saved = await updatePlan.mutateAsync({
          id: existing!.id,
          route: { ...route, start_date: startDate },
          roundTrip,
          start: startBody,          // null = unchanged
          end: roundTrip ? null : endBody,
          startNodeId: startNode?.id ?? null,
          endNodeId: endNode?.id ?? null,
        });
        onSaved(saved);
      } else {
        const created = await createPlan.mutateAsync({
          route: { name: name.trim(), start_date: startDate, ...(endDate ? { end_date: endDate } : {}), ...(teamId ? { team_id: Number(teamId) } : {}) },
          start: startBody!,
          end: roundTrip ? null : endBody,
        });
        onSaved(created);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the route — please try again.");
    }
  }

  const pending = createPlan.isPending || updatePlan.isPending;
  const title = editing ? "Edit route" : "New route";
  const saveLabel = editing
    ? (updatePlan.isPending ? "Saving…" : "Save changes")
    : (createPlan.isPending ? "Creating…" : "Create route");

  return (
    <ModalShell
      label={title}
      onClose={onClose}
      mobileSheet
      desktopWidth={520}
      zIndex={2000}
      cardClassName="poi-scroll"
      dialogOptions={{ manageHistory: false }}
      afterCard={picking !== null ? (
        <AddPlaceModal
          kind="stop"
          role={picking}
          onClose={() => setPicking(null)}
          onSubmit={(body) => {
            if (picking === "start") setStartBody(body);
            else setEndBody(body);
            setPicking(null);
          }}
        />
      ) : null}
    >
        <div style={{ position: "sticky", top: 0, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", zIndex: 2 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: isMobile ? 44 : 30, height: isMobile ? 44 : 30, fontSize: isMobile ? 20 : 14, borderRadius: theme.radius.icon, border: "none", background: "#f5f4f2", color: theme.color.textSecondary, cursor: "pointer" }}>×</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div style={{ padding: "0 24px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={fieldLabelStyle} htmlFor="route-name">Name</label>
            <input id="route-name" aria-label="Route name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alps loop" />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={fieldLabelStyle} htmlFor="route-start">Start date</label>
              <input id="route-start" aria-label="Start date" type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={fieldLabelStyle} htmlFor="route-end">End date (optional)</label>
              <input id="route-end" aria-label="End date (optional)" type="date" style={inputStyle} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {teamOptions.length > 0 && (
            <div>
              <label style={fieldLabelStyle} htmlFor="route-team">Team (optional)</label>
              <select id="route-team" aria-label="Team (optional)" style={inputStyle} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                <option value="">No team</option>
                {teamOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <p style={sectionLabel}>Start place</p>
            {startLabel ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderRadius: theme.radius.input, border: `1px solid ${theme.color.borderCard}`, background: theme.color.surface0 }}>
                <span style={{ fontFamily: theme.font.ui, fontSize: 13, fontWeight: 700, color: theme.color.textPrimary }}>▶ {startLabel}</span>
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
              {endLabel ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderRadius: theme.radius.input, border: `1px solid ${theme.color.borderCard}`, background: theme.color.surface0 }}>
                  <span style={{ fontFamily: theme.font.ui, fontSize: 13, fontWeight: 700, color: theme.color.textPrimary }}>■ {endLabel}</span>
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
            <button type="submit" disabled={!canSave || pending} style={primaryButtonStyle}>{saveLabel}</button>
          </div>
        </div>
        </form>
    </ModalShell>
  );
}
