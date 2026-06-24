import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Map as MlMap } from "maplibre-gl";
import { useAuth } from "../auth/AuthContext";
import { useCategories, usePois, useSettings } from "../queries/hooks";
import { filterPois } from "../lib/filterPois";
import type { Category } from "../types/api";
import { theme } from "../theme";
import { boundsOf } from "../map/bounds";
import Sidebar from "./Sidebar/Sidebar";
import MapView from "./MapView";
import Legend from "./Legend";

export default function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const poisQuery = usePois();
  const categoriesQuery = useCategories();
  const settingsQuery = useSettings();

  const mapRef = useRef<MlMap | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeCategoryIds, setActiveCategoryIds] = useState<number[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const categories = categoriesQuery.data ?? [];
  const categoriesById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])) as Record<number, Category>,
    [categories],
  );
  const filtered = useMemo(
    () => filterPois(poisQuery.data ?? [], searchText, activeCategoryIds),
    [poisQuery.data, searchText, activeCategoryIds],
  );

  const counts = useMemo(() => {
    const acc: Record<number, number> = {};
    for (const p of filtered) if (p.category_id != null) acc[p.category_id] = (acc[p.category_id] ?? 0) + 1;
    return acc;
  }, [filtered]);

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

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", background: theme.color.pageBg }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(true)}
        search={searchText}
        onSearch={setSearchText}
        categories={categories}
        activeCategoryIds={activeCategoryIds}
        onToggleCategory={toggleCategory}
        onClearCategories={() => setActiveCategoryIds([])}
        pois={filtered}
        categoriesById={categoriesById}
        selectedId={selectedId}
        onSelect={selectPoi}
        isLoading={poisQuery.isLoading}
        isError={poisQuery.isError}
        onRetry={() => poisQuery.refetch()}
        onFit={fitToResults}
        username={user?.username ?? ""}
        role={user?.role ?? "member"}
        onLogout={onLogout}
      />
      <main style={{ flex: 1, position: "relative", background: theme.color.mapBg }}>
        {settingsQuery.data && (
          <MapView
            pois={filtered}
            categories={categories}
            settings={settingsQuery.data}
            selectedId={selectedId}
            onSelect={selectPoi}
            onMapClick={() => {}}
            addMode={false}
            mapRef={mapRef}
          />
        )}
        <Legend categories={categories} counts={counts} />
        {sidebarCollapsed && (
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
      </main>
    </div>
  );
}
