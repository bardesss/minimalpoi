import { useMemo, useState } from "react";
import type { RouteDetail, RouteNode, RouteNodeCreate, RouteNodeKind } from "../../types/api";
import { ghostButtonStyle, theme } from "../../theme";
import { useAddNode, useUpdateNode } from "../../queries/hooks";
import LegRow from "./LegRow";
import RouteNodeRow from "./RouteNodeRow";
import RouteAttachments from "./RouteAttachments";
import NodePicker from "./NodePicker";

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
