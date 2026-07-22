import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dangerButtonStyle, ghostButtonStyle, inputStyle, primaryButtonStyle, theme } from "../theme";
import { useIsMobile } from "../lib/useMediaQuery";
import { useAuth } from "../auth/AuthContext";
import { useAddNode, useCategories, useCreateRoute, useDeleteRoute, usePois, useRoute, useRoutes, useSettings, useTeams, useUpdateRoute, useVersion } from "../queries/hooks";
import type { RouteNodeKind } from "../types/api";
import { poisNotInRoute } from "../map/routePois";
import { computeInsertPosition } from "../map/insertPosition";
import AppLayout from "../components/AppLayout";
import RouteTimeline from "../components/routes/RouteTimeline";
import RouteMap from "../components/routes/RouteMap";
import RouteAttachments from "../components/routes/RouteAttachments";
import SettingsModal from "../components/SettingsModal";
import ShareImageModal from "../components/routes/ShareImageModal";
import { formatTravel } from "../lib/formatTravel";
import { passedNodeIds, todayIso } from "../lib/dayState";
import { exportRoute } from "../api/routes";
import { triggerDownload } from "../lib/download";

const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" } as const;

export default function RoutesPage() {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const routesQuery = useRoutes();
  const settingsQuery = useSettings();
  const version = useVersion();
  const createRoute = useCreateRoute();
  const updateRoute = useUpdateRoute();
  const deleteRoute = useDeleteRoute();
  const teamsQuery = useTeams();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const routeQuery = useRoute(selectedId);
  const poisQuery = usePois();
  const categoriesQuery = useCategories();
  const addNodeFromMap = useAddNode(selectedId ?? -1);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [edit, setEdit] = useState({ name: "", start_date: "", end_date: "", team_id: "" });
  const [hoverNodeId, setHoverNodeId] = useState<number | null>(null);

  async function onLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  async function onCreate() {
    if (!newName.trim() || !newDate) return;
    const created = await createRoute.mutateAsync({
      name: newName.trim(),
      start_date: newDate,
      ...(newEnd ? { end_date: newEnd } : {}),
      ...(newTeam ? { team_id: Number(newTeam) } : {}),
    });
    setNewName("");
    setNewDate("");
    setNewEnd("");
    setNewTeam("");
    setSelectedId(created.id);
  }

  const detail = routeQuery.data;
  const canEdit = detail?.can_edit ?? false;
  const nearbyPois = poisNotInRoute(poisQuery.data ?? [], detail?.nodes ?? []);
  const passed = useMemo(
    () => (detail ? passedNodeIds(detail, todayIso()) : new Set<number>()),
    [detail],
  );
  const canAddFromMap = selectedId != null && canEdit;
  const addFromMap = (poiId: number, kind: RouteNodeKind) => {
    const poi = (poisQuery.data ?? []).find((p) => p.id === poiId);
    const position = poi ? computeInsertPosition(detail?.nodes ?? [], poi, passed) : null;
    addNodeFromMap.mutate({
      kind,
      poi_id: poiId,
      nights: kind === "stay" ? 1 : null,
      ...(position != null ? { position } : {}),
    });
  };
  const teams = teamsQuery.data ?? [];
  const myTeams = user?.role === "admin" ? teams : teams.filter((t) => user != null && t.member_ids.includes(user.id));
  const canAssignTeam = !!detail && !!user && (detail.created_by === user.id || user.role === "admin");
  const editTeamOptions = (() => {
    const opts = myTeams.map((t) => ({ id: t.id, name: t.name }));
    if (detail?.team_id != null && !opts.some((o) => o.id === detail.team_id)) {
      opts.unshift({ id: detail.team_id, name: detail.team_name ?? `Team ${detail.team_id}` });
    }
    return opts;
  })();

  async function onExport() {
    if (!detail) return;
    triggerDownload(await exportRoute(detail.id), `${detail.name}.geojson`);
  }

  function openEdit() {
    if (!detail) return;
    setEdit({ name: detail.name, start_date: detail.start_date, end_date: detail.end_date ?? "", team_id: detail.team_id != null ? String(detail.team_id) : "" });
    setEditing(true);
  }
  async function saveEdit() {
    if (!detail) return;
    if (!edit.name.trim() || !edit.start_date) return;
    await updateRoute.mutateAsync({
      id: detail.id,
      body: {
        name: edit.name.trim(),
        start_date: edit.start_date,
        end_date: edit.end_date || null,
        ...(canAssignTeam ? { team_id: edit.team_id ? Number(edit.team_id) : null } : {}),
      },
    });
    setEditing(false);
  }
  async function onDeleteRoute() {
    if (!detail) return;
    await deleteRoute.mutateAsync(detail.id);
    setConfirmDel(false);
    setSelectedId(null);
  }

  const routeAttachments = (detail?.attachments ?? []).filter((a) => a.node_id == null);

  const panel = (
    <div className="poi-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}>
      {selectedId == null ? (
        <>
          <p style={sectionLabel}>Your routes</p>
          {routesQuery.isLoading && <p style={{ fontSize: 13, color: theme.color.textPlaceholder }}>Loading…</p>}
          <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
            {(routesQuery.data ?? []).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                style={{ textAlign: "left", padding: "10px 12px", borderRadius: theme.radius.card, border: `1px solid ${theme.color.borderCard}`, background: theme.color.surface0, cursor: "pointer" }}
              >
                <div style={{ fontFamily: theme.font.ui, fontWeight: 700, fontSize: 14, color: theme.color.textPrimary }}>{r.name}</div>
                <div style={{ fontSize: 12, color: theme.color.textSecondary, marginTop: 2 }}>
                  {r.start_date} → {r.end_date ?? r.scheduled_end_date} · {r.node_count} stops · by {r.owner_username}{r.team_name ? ` · ${r.team_name}` : ""}
                </div>
              </button>
            ))}
            {routesQuery.data?.length === 0 && (
              <p style={{ margin: 0, fontSize: 13, color: theme.color.textPlaceholder }}>No routes yet. Create your first below.</p>
            )}
          </div>

          <p style={sectionLabel}>New route</p>
          <div style={{ display: "grid", gap: 8 }}>
            <input aria-label="Route name" placeholder="Route name" style={inputStyle} value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input aria-label="Start date" type="date" style={inputStyle} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <input aria-label="End date (optional)" type="date" style={inputStyle} value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
            <select aria-label="Team (optional)" style={inputStyle} value={newTeam} onChange={(e) => setNewTeam(e.target.value)}>
              <option value="">No team</option>
              {myTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button type="button" style={primaryButtonStyle} onClick={onCreate} disabled={createRoute.isPending}>Create route</button>
          </div>
        </>
      ) : (
        <>
          <button type="button" style={{ ...ghostButtonStyle, padding: "6px 12px", marginBottom: 12 }} onClick={() => setSelectedId(null)}>← All routes</button>
          {routeQuery.isLoading && <p style={{ fontSize: 13, color: theme.color.textPlaceholder }}>Loading…</p>}
          {detail && (
            <>
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "flex-start", justifyContent: "space-between", gap: isMobile ? 10 : 8 }}>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: "0 0 4px", fontFamily: theme.font.ui, fontWeight: 800, fontSize: 17, color: theme.color.textPrimary }}>{detail.name}</h2>
                  <p style={{ margin: isMobile ? 0 : "0 0 12px", fontSize: 12.5, color: theme.color.textSecondary }}>
                    {detail.start_date} → {detail.end_date ?? detail.scheduled_end_date}
                    {detail.end_date && detail.end_date !== detail.scheduled_end_date && (
                      <span style={{ color: theme.color.textPlaceholder }}> · scheduled: {detail.scheduled_end_date}</span>
                    )}
                    {detail.team_name && <span style={{ color: theme.color.textPlaceholder }}> · team: {detail.team_name}</span>}
                    {detail.total_distance_m > 0 && <> · {formatTravel(detail.total_distance_m, detail.total_duration_s)}</>}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flex: "none", flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : "flex-end", marginBottom: isMobile ? 4 : 0 }}>
                  {canEdit && <button type="button" style={{ ...ghostButtonStyle, padding: "6px 12px" }} onClick={openEdit}>Edit</button>}
                  <button type="button" style={{ ...ghostButtonStyle, padding: "6px 12px", whiteSpace: "nowrap" }} onClick={onExport}>Export</button>
                  <button
                    type="button"
                    style={{ ...ghostButtonStyle, padding: "6px 12px", whiteSpace: "nowrap" }}
                    onClick={() => setShareOpen(true)}
                    disabled={(detail.nodes.length ?? 0) === 0}
                  >
                    Share image
                  </button>
                </div>
              </div>
              {editing && canEdit && (
                <div style={{ display: "grid", gap: 8, margin: "0 0 14px" }}>
                  <input aria-label="Edit route name" style={inputStyle} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                  <input aria-label="Edit start date" type="date" style={inputStyle} value={edit.start_date} onChange={(e) => setEdit({ ...edit, start_date: e.target.value })} />
                  <input aria-label="Edit end date (optional)" type="date" style={inputStyle} value={edit.end_date} onChange={(e) => setEdit({ ...edit, end_date: e.target.value })} />
                  {canAssignTeam && (
                    <select aria-label="Edit team" style={inputStyle} value={edit.team_id} onChange={(e) => setEdit({ ...edit, team_id: e.target.value })}>
                      <option value="">No team</option>
                      {editTeamOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" style={primaryButtonStyle} onClick={saveEdit} disabled={updateRoute.isPending}>Save</button>
                    <button type="button" style={ghostButtonStyle} onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </div>
              )}
              <RouteTimeline route={detail} canEdit={canEdit} onHoverNode={setHoverNodeId} />
              <div style={{ marginTop: 18 }}>
                <p style={sectionLabel}>Route documents</p>
                <RouteAttachments routeId={detail.id} nodeId={null} attachments={routeAttachments} canEdit={canEdit} />
              </div>
              {canEdit && (
                <div style={{ marginTop: 18 }}>
                  {confirmDel ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" style={dangerButtonStyle} onClick={onDeleteRoute} disabled={deleteRoute.isPending}>Confirm delete</button>
                      <button type="button" style={ghostButtonStyle} onClick={() => setConfirmDel(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button type="button" style={ghostButtonStyle} onClick={() => setConfirmDel(true)}>Delete route</button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <AppLayout
        active="routes"
        routesEnabled={settingsQuery.data?.routes_enabled ?? false}
        sheetLabel="Routes"
        collapsed={collapsed}
        onCollapse={() => setCollapsed(true)}
        onExpand={() => setCollapsed(false)}
        reopenLabel="» Routes"
        sidebar={panel}
        main={settingsQuery.data ? (
          <RouteMap
            nodes={detail?.nodes ?? []}
            legs={detail?.legs ?? []}
            pois={nearbyPois}
            categories={categoriesQuery.data ?? []}
            settings={settingsQuery.data}
            canAdd={canAddFromMap}
            onAddNode={addFromMap}
            passedNodeIds={passed}
            highlightNodeId={hoverNodeId}
          />
        ) : null}
        account={{
          username: user?.username ?? "",
          role: user?.role ?? "member",
          onLogout,
          onOpenSettings: () => setSettingsModalOpen(true),
          updateAvailable: version.data?.update_available ?? false,
        }}
      />
      {settingsModalOpen && <SettingsModal onClose={() => setSettingsModalOpen(false)} />}
      {shareOpen && detail && settingsQuery.data && (
        <ShareImageModal route={detail} settings={settingsQuery.data} onClose={() => setShareOpen(false)} />
      )}
    </>
  );
}
