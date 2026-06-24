import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCategories, usePois } from "../queries/hooks";
import { filterPois } from "../lib/filterPois";
import type { Category } from "../types/api";
import { theme } from "../theme";
import Sidebar from "./Sidebar/Sidebar";

export default function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const poisQuery = usePois();
  const categoriesQuery = useCategories();

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

  async function onLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  function toggleCategory(id: number) {
    setActiveCategoryIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
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
        onSelect={setSelectedId}
        isLoading={poisQuery.isLoading}
        isError={poisQuery.isError}
        onRetry={() => poisQuery.refetch()}
        onFit={() => {}}
        username={user?.username ?? ""}
        role={user?.role ?? "member"}
        onLogout={onLogout}
      />
      <main style={{ flex: 1, position: "relative", background: theme.color.mapBg }}>
        {/* MapView mounts here in Increment 2 */}
      </main>
    </div>
  );
}
