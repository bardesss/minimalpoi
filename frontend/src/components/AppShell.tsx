import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Map as MlMap } from "maplibre-gl";
import { useAuth } from "../auth/AuthContext";
import { useCategories, useCreatePoi, useDeletePoi, useEnrich, useMyVisits, usePlaceDraft, usePois, useSearchPlaces, useSettings, useUpdatePoi, useUploadImage, useCheckDuplicate, useVersion } from "../queries/hooks";
import { filterPois, UNCATEGORIZED_ID } from "../lib/filterPois";
import type { Category, Poi, PoiCreate, VisitedFilter } from "../types/api";
import { boundsOf } from "../map/bounds";
import { readMapViewMode, writeMapViewMode, type MapViewMode } from "../lib/mapViewPref";
import { readSortMode, writeSortMode, type SortMode } from "../lib/sortPref";
import { sortPois } from "../lib/sortPois";
import { useIsMobile } from "../lib/useMediaQuery";
import { useSearchHotkey } from "../lib/useSearchHotkey";
import SidebarContent from "./Sidebar/SidebarContent";
import MapView from "./MapView";
import Legend from "./Legend";
import DetailPanel from "./DetailPanel";
import AddFab from "./AddFab";
import PoiFormModal, { type PoiFormInitial } from "./PoiFormModal";
import SettingsModal from "./SettingsModal";
import AppLayout from "./AppLayout";

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
  const uploadImage = useUploadImage();
  const version = useVersion();

  const mapRef = useRef<MlMap | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeCategoryIds, setActiveCategoryIds] = useState<number[]>([]);
  const [visitedFilter, setVisitedFilter] = useState<VisitedFilter>("any");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mapViewMode, setMapViewMode] = useState<MapViewMode>(() => readMapViewMode());
  const [sortMode, setSortMode] = useState<SortMode>(() => readSortMode());
  const [mapCenter, setMapCenter] = useState<{ lng: number; lat: number } | null>(null);
  const sortModeRef = useRef(sortMode);
  sortModeRef.current = sortMode;
  const [formState, setFormState] = useState<{ mode: "add" | "edit"; initial: PoiFormInitial | null } | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [addCoords, setAddCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [duplicateId, setDuplicateId] = useState<number | null>(null);

  // Global "/" or Ctrl/Cmd-K shortcut: reveal the sidebar (desktop) and focus
  // the search input. On mobile the sidebar/search box is always mounted
  // inside the bottom sheet, so no expand step is needed there.
  useSearchHotkey(() => {
    setSidebarCollapsed(false);
    requestAnimationFrame(() => {
      const el = document.getElementById("poi-search") as HTMLInputElement | null;
      el?.focus();
      el?.select();
    });
  });

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

  // Ordered list for the sidebar/sheet. Distance re-sorts as the map center
  // changes; other modes ignore it (so panning doesn't re-sort needlessly).
  const centerForSort = sortMode === "distance" ? mapCenter : null;
  const sorted = useMemo(
    () => sortPois(filtered, sortMode, centerForSort),
    [filtered, sortMode, centerForSort],
  );

  const counts = useMemo(() => {
    const acc: Record<number, number> = {};
    for (const p of filtered) {
      const key = p.category_id ?? UNCATEGORIZED_ID;
      acc[key] = (acc[key] ?? 0) + 1;
    }
    return acc;
  }, [filtered]);

  // Show the "Uncategorized" bucket only when some place actually lacks a
  // category (checked against the full set, not the current filter).
  const hasUncategorized = useMemo(
    () => (poisQuery.data ?? []).some((p) => p.category_id == null),
    [poisQuery.data],
  );

  const selectedPoi = (poisQuery.data ?? []).find((p) => p.id === selectedId) ?? null;
  const addMode = formState?.mode === "add";

  async function onLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  function toggleCategory(id: number) {
    setActiveCategoryIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  // Stable identity so memoized PoiCards (in the virtualized list) don't
  // re-render on every parent render (e.g. a distance re-sort).
  const selectPoi = useCallback((id: number) => {
    setSelectedId(id);
    const poi = (poisQuery.data ?? []).find((p) => p.id === id);
    const map = mapRef.current;
    if (poi && map) map.flyTo({ center: [poi.lng, poi.lat], zoom: Math.max(map.getZoom(), 14), duration: 600 });
  }, [poisQuery.data]);

  function fitToResults() {
    const b = boundsOf(filtered);
    if (b && mapRef.current) mapRef.current.fitBounds(b, { padding: 60, maxZoom: 15, duration: 600 });
  }

  function resetToDefaultCenter() {
    const s = settingsQuery.data;
    if (s && mapRef.current) mapRef.current.flyTo({ center: [s.default_map_center_lng, s.default_map_center_lat], zoom: s.default_map_zoom, duration: 600 });
  }

  function changeSort(mode: SortMode) {
    setSortMode(mode);
    writeSortMode(mode);
    // Seed the center immediately so "Nearest" sorts on the current view without
    // waiting for the next pan.
    if (mode === "distance") {
      const c = mapRef.current?.getCenter();
      if (c) setMapCenter({ lng: c.lng, lat: c.lat });
    }
  }

  // Only track the center while sorting by distance — avoids re-rendering the
  // list on every pan in the common (non-distance) case.
  const handleMoveEnd = useCallback((c: { lng: number; lat: number }) => {
    if (sortModeRef.current === "distance") setMapCenter(c);
  }, []);

  function changeMapViewMode(mode: MapViewMode) {
    setMapViewMode(mode);
    writeMapViewMode(mode);
    if (mode === "fit") fitToResults();
    else resetToDefaultCenter();
  }

  // In "fit" mode keep the camera framed on the current results — on first load
  // and whenever the filtered set changes. Selecting a place still flies to it
  // (selection doesn't change `filtered`, so it won't be overridden).
  useEffect(() => {
    if (mapViewMode === "fit") fitToResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, mapViewMode]);

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
      initial: { name: poi.name, address: poi.address, city: poi.city, country_code: poi.country_code, lat: poi.lat, lng: poi.lng, category_id: poi.category_id, tags: poi.tags, notes: poi.notes, phone: poi.phone, email: poi.email, website: poi.website, image_url: poi.image_url },
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

  const sidebarContent = (
    <SidebarContent
      search={searchText}
      onSearch={setSearchText}
      categories={categories}
      activeCategoryIds={activeCategoryIds}
      onToggleCategory={toggleCategory}
      onClearCategories={() => setActiveCategoryIds([])}
      hasUncategorized={hasUncategorized}
      visited={visitedFilter}
      onVisitedChange={setVisitedFilter}
      pois={sorted}
      categoriesById={categoriesById}
      myVisitedPoiIds={myVisitedPoiIds}
      selectedId={selectedId}
      onSelect={selectPoi}
      isLoading={poisQuery.isLoading}
      isError={poisQuery.isError}
      onRetry={() => poisQuery.refetch()}
      viewMode={mapViewMode}
      onViewModeChange={changeMapViewMode}
      sortMode={sortMode}
      onSortChange={changeSort}
      mobile={isMobile}
    />
  );

  const main = (
    <>
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
          onMoveEnd={handleMoveEnd}
          onUserLocate={(c) => setMapCenter(c)}
        />
      )}
      {!isMobile && <Legend categories={categories} counts={counts} uncategorizedCount={hasUncategorized ? counts[UNCATEGORIZED_ID] ?? 0 : 0} />}
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
          getMapCenter={() => {
            const c = mapRef.current?.getCenter();
            return c ? { lng: c.lng, lat: c.lat } : null;
          }}
          onSubmit={submitForm}
          onClose={closeForm}
          onCheckDuplicate={runDuplicateCheck}
          duplicateId={duplicateId}
          onEnrich={(url) => enrich.mutateAsync(url)}
          onSearchPlaces={(q) => searchPlaces.mutateAsync(q)}
          onPickPlace={(placeId) => placeDraft.mutateAsync(placeId)}
          onUploadImage={(file) => uploadImage.mutateAsync(file)}
        />
      )}
      {settingsModalOpen && <SettingsModal onClose={() => setSettingsModalOpen(false)} />}
    </>
  );

  return (
    <AppLayout
      active="map"
      routesEnabled={settingsQuery.data?.routes_enabled ?? false}
      sheetLabel="Places"
      collapsed={sidebarCollapsed}
      onCollapse={() => setSidebarCollapsed(true)}
      onExpand={() => setSidebarCollapsed(false)}
      reopenLabel={`» ${filtered.length} places`}
      sidebar={sidebarContent}
      main={main}
      account={{
        username: user?.username ?? "",
        role: user?.role ?? "member",
        onLogout: onLogout,
        onOpenSettings: () => setSettingsModalOpen(true),
        updateAvailable: version.data?.update_available ?? false,
      }}
    />
  );
}
