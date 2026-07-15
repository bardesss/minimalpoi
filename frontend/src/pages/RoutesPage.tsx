import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { dangerButtonStyle, ghostButtonStyle, inputStyle, primaryButtonStyle, theme } from "../theme";
import { useAuth } from "../auth/AuthContext";
import { useCreateRoute, useDeleteRoute, useRoute, useRoutes, useSettings, useUpdateRoute, useVersion } from "../queries/hooks";
import AppLayout from "../components/AppLayout";
import RouteTimeline from "../components/routes/RouteTimeline";
import RouteMap from "../components/routes/RouteMap";
import RouteAttachments from "../components/routes/RouteAttachments";
import SettingsModal from "../components/SettingsModal";
import { formatTravel } from "../lib/formatTravel";
import { exportRoute } from "../api/routes";
import { triggerDownload } from "../lib/download";

const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" } as const;

export default function RoutesPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const routesQuery = useRoutes();
  const settingsQuery = useSettings();
  const version = useVersion();
  const createRoute = useCreateRoute();
  const updateRoute = useUpdateRoute();
  const deleteRoute = useDeleteRoute();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const routeQuery = useRoute(selectedId);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [edit, setEdit] = useState({ name: "", start_date: "", end_date: "" });

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
    });
    setNewName("");
    setNewDate("");
    setNewEnd("");
    setSelectedId(created.id);
  }

  const detail = routeQuery.data;
  const canEdit = !!detail && !!user && (detail.created_by === user.id || user.role === "admin");

  async function onExport() {
    if (!detail) return;
    triggerDownload(await exportRoute(detail.id), `${detail.name}.geojson`);
  }

  function openEdit() {
    if (!detail) return;
    setEdit({ name: detail.name, start_date: detail.start_date, end_date: detail.end_date ?? "" });
    setEditing(true);
  }
  async function saveEdit() {
    if (!detail) return;
    await updateRoute.mutateAsync({
      id: detail.id,
      body: { name: edit.name.trim(), start_date: edit.start_date, end_date: edit.end_date || null },
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
                  {r.start_date} → {r.end_date ?? r.scheduled_end_date} · {r.node_count} stops · by {r.owner_username}
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
            <button type="button" style={primaryButtonStyle} onClick={onCreate} disabled={createRoute.isPending}>Create route</button>
          </div>
        </>
      ) : (
        <>
          <button type="button" style={{ ...ghostButtonStyle, padding: "6px 12px", marginBottom: 12 }} onClick={() => setSelectedId(null)}>← All routes</button>
          {routeQuery.isLoading && <p style={{ fontSize: 13, color: theme.color.textPlaceholder }}>Loading…</p>}
          {detail && (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontFamily: theme.font.ui, fontWeight: 800, fontSize: 17, color: theme.color.textPrimary }}>{detail.name}</h2>
                  <p style={{ margin: "0 0 12px", fontSize: 12.5, color: theme.color.textSecondary }}>
                    {detail.start_date} → {detail.end_date ?? detail.scheduled_end_date}
                    {detail.end_date && detail.end_date !== detail.scheduled_end_date && (
                      <span style={{ color: theme.color.textPlaceholder }}> · scheduled: {detail.scheduled_end_date}</span>
                    )}
                    {detail.total_distance_m > 0 && <> · {formatTravel(detail.total_distance_m, detail.total_duration_s)}</>}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {canEdit && <button type="button" style={{ ...ghostButtonStyle, padding: "6px 12px" }} onClick={openEdit}>Edit</button>}
                  <button type="button" style={{ ...ghostButtonStyle, padding: "6px 12px", whiteSpace: "nowrap" }} onClick={onExport}>Export</button>
                </div>
              </div>
              {editing && canEdit && (
                <div style={{ display: "grid", gap: 8, margin: "0 0 14px" }}>
                  <input aria-label="Edit route name" style={inputStyle} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                  <input aria-label="Edit start date" type="date" style={inputStyle} value={edit.start_date} onChange={(e) => setEdit({ ...edit, start_date: e.target.value })} />
                  <input aria-label="Edit end date (optional)" type="date" style={inputStyle} value={edit.end_date} onChange={(e) => setEdit({ ...edit, end_date: e.target.value })} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" style={primaryButtonStyle} onClick={saveEdit} disabled={updateRoute.isPending}>Save</button>
                    <button type="button" style={ghostButtonStyle} onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </div>
              )}
              <RouteTimeline route={detail} canEdit={canEdit} />
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
        main={settingsQuery.data ? <RouteMap nodes={detail?.nodes ?? []} settings={settingsQuery.data} /> : null}
        account={{
          username: user?.username ?? "",
          role: user?.role ?? "member",
          onLogout,
          onOpenSettings: () => setSettingsModalOpen(true),
          updateAvailable: version.data?.update_available ?? false,
        }}
      />
      {settingsModalOpen && <SettingsModal onClose={() => setSettingsModalOpen(false)} />}
    </>
  );
}
