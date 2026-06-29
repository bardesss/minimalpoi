import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Map as MlMap } from "maplibre-gl";
import { useAuth } from "../auth/AuthContext";
import { useCategories, useCreatePoi, useDeletePoi, useEnrich, useMyVisits, usePlaceDraft, usePois, useSearchPlaces, useSettings, useUpdatePoi, useCheckDuplicate, useVersion } from "../queries/hooks";
import { filterPois } from "../lib/filterPois";
import type { Category, Poi, PoiCreate, VisitedFilter } from "../types/api";
import { theme } from "../theme";
import { boundsOf } from "../map/bounds";
import { useIsMobile } from "../lib/useMediaQuery";
import Sidebar from "./Sidebar/Sidebar";
import SidebarContent from "./Sidebar/SidebarContent";
import AccountFooter from "./Sidebar/AccountFooter";
import BottomSheet from "./BottomSheet";
import MapView from "./MapView";
import Legend from "./Legend";
import DetailPanel from "./DetailPanel";
import AddFab from "./AddFab";
import PoiFormModal, { type PoiFormInitial } from "./PoiFormModal";
import SettingsModal from "./SettingsModal";

export default function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const poisQuery = usePois();
  const categoriesQuery = useCategories();
  const settingsQuery = useSettings();
  const myVisitsQuery = useMyVisits();

  const createPoi = useCreatePoi();
  const updatePoi = useUpdatePoi();
  const deletePoi = useDeletePoi();
  const checkDuplicate = useCheckDuplicate();
  const enrich = useEnrich();
  const searchPlaces = useSearchPlaces();
  const placeDraft = usePlaceDraft();
  const version = useVersion();

  const mapRef = useRef<MlMap | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeCategoryIds, setActiveCategoryIds] = useState<number[]>([]);
  const [visitedFilter, setVisitedFilter] = useState<VisitedFilter>("any");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [formState, setFormState] = useState<{ mode: "add" | "edit"; initial: PoiFormInitial | null } | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [addCoords, setAddCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [duplicateId, setDuplicateId] = useState<number | null>(null);

  const categories = categoriesQuery.data ?? [];
  const categoriesById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])) as Record<number, Category>,
    [categories],
  );
  const myVisitedPoiIds = useMemo(
    () => new Set((myVisitsQuery.data ?? []).map((v) => v.poi_id)),
    [myVisitsQuery.data],
  );
  const filtered = useMemo(
    () =>
      filterPois(
        poisQuery.data ?? [],
        { search: searchText, categoryIds: activeCategoryIds, visited: visitedFilter },
        { myVisitedPoiIds },
      ),
    [poisQuery.data, searchText, activeCategoryIds, visitedFilter, myVisitedPoiIds],
  );

  const counts = useMemo(() => {
    const acc: Record<number, number> = {};
    for (const p of filtered) if (p.category_id != null) acc[p.category_id] = (acc[p.category_id] ?? 0) + 1;
    return acc;
  }, [filtered]);

  const selectedPoi = (poisQuery.data ?? []).find((p) => p.id === selectedId) ?? null;
  const addMode = formState?.mode === "add";

  async function onLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  function toggleCategory(id: number) {
    setActiveCategoryIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function selectPoi(id: number) {
    setSelectedId(id);
    const poi = (poisQuery.data ?? []).find((p) => p.id === id);
    const map = mapRef.current;
    if (poi && map) map.flyTo({ center: [poi.lng, poi.lat], zoom: Math.max(map.getZoom(), 14), duration: 600 });
  }

  function fitToResults() {
    const b = boundsOf(filtered);
    if (b && mapRef.current) mapRef.current.fitBounds(b, { padding: 60, maxZoom: 15, duration: 600 });
  }

  function openAdd() {
    const c = mapRef.current?.getCenter();
    setDuplicateId(null);
    setAddCoords(c ? { lng: c.lng, lat: c.lat } : null);
    setFormState({ mode: "add", initial: null });
  }

  function openEdit(poi: Poi) {
    setDuplicateId(null);
    setFormState({
      mode: "edit",
      initial: { name: poi.name, address: poi.address, city: poi.city, country_code: poi.country_code, lat: poi.lat, lng: poi.lng, category_id: poi.category_id, tags: poi.tags, notes: poi.notes, phone: poi.phone, email: poi.email, website: poi.website },
    });
  }

  function closeForm() {
    setFormState(null);
    setAddCoords(null);
    setDuplicateId(null);
  }

  async function submitForm(payload: PoiCreate) {
    if (formState?.mode === "edit" && selectedId != null) {
      await updatePoi.mutateAsync({ id: selectedId, body: payload });
      closeForm();
      return;
    }
    const created = await createPoi.mutateAsync(payload);
    closeForm();
    setSelectedId(created.id);
    mapRef.current?.flyTo({ center: [created.lng, created.lat], zoom: 15, duration: 600 });
  }

  async function runDuplicateCheck(body: { name: string; lat: number; lng: number }) {
    const res = await checkDuplicate.mutateAsync(body);
    setDuplicateId(res.duplicate_id);
  }

  async function confirmDelete() {
    if (selectedId == null) return;
    await deletePoi.mutateAsync(selectedId);
    setSelectedId(null);
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", background: theme.color.pageBg }}>
      {!isMobile && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(true)}
          search={searchText}
          onSearch={setSearchText}
          categories={categories}
          activeCategoryIds={activeCategoryIds}
          onToggleCategory={toggleCategory}
          onClearCategories={() => setActiveCategoryIds([])}
          visited={visitedFilter}
          onVisitedChange={setVisitedFilter}
          pois={filtered}
          categoriesById={categoriesById}
          myVisitedPoiIds={myVisitedPoiIds}
          selectedId={selectedId}
          onSelect={selectPoi}
          isLoading={poisQuery.isLoading}
          isError={poisQuery.isError}
          onRetry={() => poisQuery.refetch()}
          onFit={fitToResults}
          username={user?.username ?? ""}
          role={user?.role ?? "member"}
          onLogout={onLogout}
          onOpenSettings={() => setSettingsModalOpen(true)}
          updateAvailable={version.data?.update_available ?? false}
        />
      )}
      <main style={{ flex: 1, position: "relative", background: theme.color.mapBg }}>
        {settingsQuery.data && (
          <MapView
            pois={filtered}
            categories={categories}
            settings={settingsQuery.data}
            selectedId={selectedId}
            onSelect={selectPoi}
            onMapClick={(lng, lat) => setAddCoords({ lng, lat })}
            addMode={addMode}
            visitedPoiIds={myVisitedPoiIds}
            mapRef={mapRef}
          />
        )}
        {!isMobile && <Legend categories={categories} counts={counts} />}
        {!isMobile && sidebarCollapsed && (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              zIndex: 1100,
              background: "#fff",
              border: `1px solid ${theme.color.borderCard}`,
              borderRadius: 11,
              padding: "10px 14px",
              boxShadow: theme.shadow.expand,
              fontFamily: theme.font.ui,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            » {filtered.length} places
          </button>
        )}
        {selectedPoi && (
          <DetailPanel
            poi={selectedPoi}
            category={selectedPoi.category_id != null ? categoriesById[selectedPoi.category_id] : undefined}
            onClose={() => setSelectedId(null)}
            onEdit={() => openEdit(selectedPoi)}
            onDelete={confirmDelete}
            mobile={isMobile}
          />
        )}
        {!(isMobile && selectedPoi) && <AddFab onClick={openAdd} mobile={isMobile} />}
        {formState && (
          <PoiFormModal
            mode={formState.mode}
            initial={formState.initial}
            categories={categories}
            coords={addCoords}
            onSubmit={submitForm}
            onClose={closeForm}
            onCheckDuplicate={runDuplicateCheck}
            duplicateId={duplicateId}
            onEnrich={(url) => enrich.mutateAsync(url)}
            onSearchPlaces={(q) => searchPlaces.mutateAsync(q)}
            onPickPlace={(placeId) => placeDraft.mutateAsync(placeId)}
          />
        )}
        {settingsModalOpen && <SettingsModal onClose={() => setSettingsModalOpen(false)} />}
      </main>
      {isMobile && (
        <BottomSheet label="Places" initial="half">
          <SidebarContent
            search={searchText}
            onSearch={setSearchText}
            categories={categories}
            activeCategoryIds={activeCategoryIds}
            onToggleCategory={toggleCategory}
            onClearCategories={() => setActiveCategoryIds([])}
            visited={visitedFilter}
            onVisitedChange={setVisitedFilter}
            pois={filtered}
            categoriesById={categoriesById}
            myVisitedPoiIds={myVisitedPoiIds}
            selectedId={selectedId}
            onSelect={selectPoi}
            isLoading={poisQuery.isLoading}
            isError={poisQuery.isError}
            onRetry={() => poisQuery.refetch()}
            onFit={fitToResults}
            mobile
          />
          <AccountFooter
            username={user?.username ?? ""}
            role={user?.role ?? "member"}
            onLogout={onLogout}
            onOpenSettings={() => setSettingsModalOpen(true)}
            updateAvailable={version.data?.update_available ?? false}
          />
        </BottomSheet>
      )}
    </div>
  );
}
