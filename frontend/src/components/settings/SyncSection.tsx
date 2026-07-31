import { useResolveConflict, useSyncConflicts, useSyncNow, useSyncStatus } from "../../queries/hooks";
import { useToast } from "../Toast";
import type { SyncConflict, SyncResolution } from "../../types/api";
import { dangerButtonStyle, ghostButtonStyle, primaryButtonStyle, theme } from "../../theme";

const meta = { fontSize: 12.5, color: theme.color.textPlaceholder } as const;

export default function SyncSection() {
  const status = useSyncStatus().data;
  const conflicts = useSyncConflicts().data ?? [];
  const resolve = useResolveConflict();
  const syncNow = useSyncNow();
  const { notify } = useToast();

  const lastRun = status?.last_run ? new Date(status.last_run).toLocaleString() : "Never";

  async function doResolve(c: SyncConflict, resolution: SyncResolution) {
    try {
      await resolve.mutateAsync({ entity_type: c.entity_type, id: c.id, resolution });
      notify("Conflict resolved");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Resolve failed", "error");
    }
  }

  async function runSync() {
    try {
      await syncNow.mutateAsync();
      notify("Sync complete");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Sync failed", "error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>
          Sync {status?.enabled ? "enabled" : "disabled"}
        </span>
        <span style={meta}>Last run: {lastRun}</span>
        <span style={meta}>
          {status?.conflict_count ?? 0} conflict(s) · {status?.error_count ?? 0} error(s)
        </span>
        <button
          type="button"
          onClick={runSync}
          disabled={syncNow.isPending}
          style={{ ...primaryButtonStyle, padding: "6px 14px", marginLeft: "auto" }}
        >
          {syncNow.isPending ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {conflicts.length === 0 ? (
        <div style={meta}>No conflicts or errors. 🎉</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {conflicts.map((c) => (
            <div
              key={`${c.entity_type}-${c.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                border: `1px solid ${theme.color.borderCard}`,
                borderRadius: theme.radius.input,
                flexWrap: "wrap",
              }}
            >
              <span style={{ flex: 1, minWidth: 120, fontSize: 13.5, fontWeight: 700 }}>
                {c.name}{" "}
                <span style={{ color: theme.color.textPlaceholder, fontWeight: 500 }}>
                  · {c.entity_type} · {c.status}
                </span>
                {c.last_error && (
                  <div style={{ ...meta, color: theme.color.dangerText }}>{c.last_error}</div>
                )}
              </span>
              <button
                type="button"
                onClick={() => doResolve(c, "local")}
                disabled={resolve.isPending}
                style={{ ...ghostButtonStyle, padding: "6px 12px" }}
              >
                Keep MinimalPOI
              </button>
              <button
                type="button"
                onClick={() => doResolve(c, "trip")}
                disabled={resolve.isPending}
                style={{ ...dangerButtonStyle, padding: "6px 12px" }}
              >
                Keep TRIP
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
