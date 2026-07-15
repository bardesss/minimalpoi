import { useMemo, useState } from "react";
import type { RouteDetail, RouteNode, RouteNodeCreate, RouteNodeKind } from "../../types/api";
import { ghostButtonStyle, inputStyle, primaryButtonStyle, theme } from "../../theme";
import { useAddNode, usePois, useUpdateNode } from "../../queries/hooks";
import LegRow from "./LegRow";
import RouteNodeRow from "./RouteNodeRow";
import RouteAttachments from "./RouteAttachments";

const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" } as const;

/** New fractional position that moves node at `index` one slot in `dir`. Places
 * it at the midpoint of its new neighbours (or just past the end). */
export function computeMovePosition(nodes: RouteNode[], index: number, dir: -1 | 1): number | null {
  const target = index + dir;
  if (target < 0 || target >= nodes.length) return null;
  if (dir === -1) {
    const before = nodes[target - 1];
    return before ? (before.position + nodes[target].position) / 2 : nodes[target].position - 1;
  }
  const after = nodes[target + 1];
  return after ? (nodes[target].position + after.position) / 2 : nodes[target].position + 1;
}

export default function RouteTimeline({ route, canEdit }: { route: RouteDetail; canEdit: boolean }) {
  const nodes = route.nodes;
  const legByPair = useMemo(() => {
    const m = new Map<string, RouteDetail["legs"][number]>();
    for (const l of route.legs) m.set(`${l.from_node_id}:${l.to_node_id}`, l);
    return m;
  }, [route.legs]);

  const addNode = useAddNode(route.id);
  const updateNode = useUpdateNode(route.id);

  const [adding, setAdding] = useState<RouteNodeKind | null>(null);

  function move(index: number, dir: -1 | 1) {
    const pos = computeMovePosition(nodes, index, dir);
    if (pos != null) updateNode.mutate({ nodeId: nodes[index].id, body: { position: pos } });
  }

  function submit(body: RouteNodeCreate) {
    addNode.mutate(body);
    setAdding(null);
  }

  return (
    <div>
      <p style={sectionLabel}>Itinerary</p>
      {nodes.length === 0 && (
        <p style={{ margin: "0 0 12px", fontSize: 13, color: theme.color.textPlaceholder }}>
          No stops yet. Add a stay or a stop to start building the route.
        </p>
      )}
      <div>
        {nodes.map((n, i) => {
          const leg = i < nodes.length - 1 ? legByPair.get(`${n.id}:${nodes[i + 1].id}`) : undefined;
          return (
            <div key={n.id}>
              <RouteNodeRow
                node={n}
                routeId={route.id}
                canEdit={canEdit}
                isFirst={i === 0}
                isLast={i === nodes.length - 1}
                onMove={(dir) => move(i, dir)}
              >
                <RouteAttachments
                  routeId={route.id}
                  nodeId={n.id}
                  attachments={route.attachments.filter((a) => a.node_id === n.id)}
                  canEdit={canEdit}
                />
              </RouteNodeRow>
              {leg && <LegRow leg={leg} />}
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div style={{ marginTop: 12 }}>
          {adding ? (
            <NodePicker kind={adding} onCancel={() => setAdding(null)} onSubmit={submit} />
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={ghostButtonStyle} onClick={() => setAdding("stay")}>+ Add stay</button>
              <button type="button" style={ghostButtonStyle} onClick={() => setAdding("stop")}>+ Add stop</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NodePicker({
  kind,
  onCancel,
  onSubmit,
}: {
  kind: RouteNodeKind;
  onCancel: () => void;
  onSubmit: (body: RouteNodeCreate) => void;
}) {
  const poisQuery = usePois();
  const [search, setSearch] = useState("");
  const [manual, setManual] = useState(false);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const nights = kind === "stay" ? 1 : null;
  const pois = (poisQuery.data ?? []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  function pickPoi(poiId: number) {
    onSubmit({ kind, poi_id: poiId, nights });
  }
  function addManual() {
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!name.trim() || Number.isNaN(latN) || Number.isNaN(lngN)) return;
    onSubmit({ kind, name: name.trim(), lat: latN, lng: lngN, nights });
  }

  return (
    <div style={{ border: `1px solid ${theme.color.borderStd}`, borderRadius: theme.radius.card, padding: 12, background: theme.color.pageBg }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <strong style={{ fontFamily: theme.font.ui, fontSize: 13 }}>Add {kind}</strong>
        <button type="button" aria-label="Cancel" style={{ ...ghostButtonStyle, padding: "4px 10px" }} onClick={onCancel}>Cancel</button>
      </div>

      {manual ? (
        <div style={{ display: "grid", gap: 8 }}>
          <input aria-label="Point name" placeholder="Name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <input aria-label="Latitude" placeholder="Latitude" style={inputStyle} value={lat} onChange={(e) => setLat(e.target.value)} />
            <input aria-label="Longitude" placeholder="Longitude" style={inputStyle} value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={primaryButtonStyle} onClick={addManual}>Add point</button>
            <button type="button" style={ghostButtonStyle} onClick={() => setManual(false)}>Pick a place instead</button>
          </div>
        </div>
      ) : (
        <div>
          <input aria-label="Search places" placeholder="Search places…" style={{ ...inputStyle, marginBottom: 8 }} value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="poi-scroll" style={{ maxHeight: 180, overflowY: "auto", display: "grid", gap: 4 }}>
            {pois.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPoi(p.id)}
                style={{ textAlign: "left", padding: "8px 10px", borderRadius: theme.radius.input, border: `1px solid ${theme.color.borderSubtle}`, background: theme.color.surface0, cursor: "pointer", fontFamily: theme.font.ui, fontSize: 13, color: theme.color.textPrimary }}
              >
                {p.name}
              </button>
            ))}
            {pois.length === 0 && <p style={{ margin: 0, fontSize: 12.5, color: theme.color.textPlaceholder }}>No matching places.</p>}
          </div>
          <button type="button" style={{ ...ghostButtonStyle, marginTop: 8 }} onClick={() => setManual(true)}>Add a point manually</button>
        </div>
      )}
    </div>
  );
}
