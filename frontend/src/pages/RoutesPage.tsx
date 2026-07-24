import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { dangerButtonStyle, ghostButtonStyle, primaryButtonStyle, theme } from "../theme";
import { useIsMobile } from "../lib/useMediaQuery";
import { useAuth } from "../auth/AuthContext";
import { useAddNode, useCategories, useDeleteRoute, usePois, useRoute, useRoutes, useSettings, useTeams, useVersion } from "../queries/hooks";
import type { RouteNodeKind } from "../types/api";
import { poisNotInRoute } from "../map/routePois";
import { computeInsertPosition } from "../map/insertPosition";
import AppLayout from "../components/AppLayout";
import RouteTimeline from "../components/routes/RouteTimeline";
import RouteMap from "../components/routes/RouteMap";
import ExportMenu from "../components/routes/ExportMenu";
import SettingsModal from "../components/SettingsModal";
import ShareImageModal from "../components/routes/ShareImageModal";
import RouteFormModal from "../components/routes/RouteFormModal";
import { formatTravel } from "../lib/formatTravel";
import { passedNodeIds, todayIso } from "../lib/dayState";
import { exportRoute, type RouteExportFormat } from "../api/routes";
import { triggerDownload } from "../lib/download";
import { useRouteEvents } from "../queries/useRouteEvents";
import { useToast } from "../components/Toast";

const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" } as const;

export default function RoutesPage() {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const routesQuery = useRoutes();
  const settingsQuery = useSettings();
  const version = useVersion();
  const deleteRoute = useDeleteRoute();
  const teamsQuery = useTeams();

  const { id: routeIdParam } = useParams();
  // Selection lives in the URL (/routes/:id) so refresh, deep-link, and browser
  // back all work. A non-numeric/garbage id falls back to the list.
  const selectedId = routeIdParam != null && /^\d+$/.test(routeIdParam) ? Number(routeIdParam) : null;
  const routeQuery = useRoute(selectedId);
  const poisQuery = usePois();
  const categoriesQuery = useCategories();
  const addNodeFromMap = useAddNode(selectedId ?? -1);
  const [newRouteOpen, setNewRouteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [hoverNodeId, setHoverNodeId] = useState<number | null>(null);
  const [timelineBusy, setTimelineBusy] = useState(false);
  const toast = useToast();

  useRouteEvents(selectedId, {
    suspended: newRouteOpen || editingRoute || timelineBusy,
    onDeleted: () => { toast.notify("This route was deleted", "error"); navigate("/routes"); },
  });

  async function onLogout() {
    await signOut();
    navigate("/login", { replace: true });
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

  async function onExport(format: RouteExportFormat) {
    if (!detail) return;
    triggerDownload(await exportRoute(detail.id, format), `${detail.name}.${format}`);
  }

  async function onDeleteRoute() {
    if (!detail) return;
    await deleteRoute.mutateAsync(detail.id);
    setConfirmDel(false);
    navigate("/routes");
  }


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
                onClick={() => navigate("/routes/" + r.id)}
                className="hover-row"
                style={{ textAlign: "left", padding: "10px 12px", borderRadius: theme.radius.card, border: `1px solid ${theme.color.borderCard}`, background: theme.color.surface0, cursor: "pointer" }}
              >
                <div style={{ fontFamily: theme.font.ui, fontWeight: 700, fontSize: 14, color: theme.color.textPrimary }}>{r.name}</div>
                <div style={{ fontSize: 12, color: theme.color.textSecondary, marginTop: 2 }}>
                  {r.start_date} → {r.end_date ?? r.scheduled_end_date} · {r.node_count} stops · by {r.owner_username}{r.team_name ? ` · ${r.team_name}` : ""}
                </div>
              </button>
            ))}
            {routesQuery.data?.length === 0 && (
              <p style={{ margin: 0, fontSize: 13, color: theme.color.textPlaceholder }}>No routes yet. Create your first one.</p>
            )}
          </div>

          <button type="button" className="hover-btn-primary" style={primaryButtonStyle} onClick={() => setNewRouteOpen(true)}>+ New route</button>
        </>
      ) : (
        <>
          <button type="button" className="hover-btn" style={{ ...ghostButtonStyle, padding: "6px 12px", marginBottom: 12 }} onClick={() => navigate("/routes")}>← All routes</button>
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
                  {canEdit && <button type="button" className="hover-btn" style={{ ...ghostButtonStyle, padding: "6px 12px" }} onClick={() => setEditingRoute(true)}>Edit</button>}
                  <ExportMenu onExport={onExport} />
                  <button
                    type="button"
                    className="hover-btn"
                    style={{ ...ghostButtonStyle, padding: "6px 12px", whiteSpace: "nowrap" }}
                    onClick={() => setShareOpen(true)}
                    disabled={(detail.nodes.length ?? 0) === 0}
                  >
                    Share image
                  </button>
                </div>
              </div>
              <RouteTimeline route={detail} canEdit={canEdit} onHoverNode={setHoverNodeId} onInteractingChange={setTimelineBusy} />
              {canEdit && (
                <div style={{ marginTop: 18 }}>
                  {confirmDel ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" style={dangerButtonStyle} onClick={onDeleteRoute} disabled={deleteRoute.isPending}>Confirm delete</button>
                      <button type="button" className="hover-btn" style={ghostButtonStyle} onClick={() => setConfirmDel(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button type="button" className="hover-btn" style={ghostButtonStyle} onClick={() => setConfirmDel(true)}>Delete route</button>
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
      {newRouteOpen && (
        <RouteFormModal
          teams={myTeams.map((t) => ({ id: t.id, name: t.name }))}
          existing={null}
          onClose={() => setNewRouteOpen(false)}
          onSaved={(route) => { setNewRouteOpen(false); navigate("/routes/" + route.id); }}
        />
      )}
      {editingRoute && detail && (
        <RouteFormModal
          teams={myTeams.map((t) => ({ id: t.id, name: t.name }))}
          existing={detail}
          onClose={() => setEditingRoute(false)}
          onSaved={() => setEditingRoute(false)}
        />
      )}
    </>
  );
}
