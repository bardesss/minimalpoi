import { useMemo, useState } from "react";
import type { RouteDetail, RouteNode, RouteNodeCreate, RouteNodeKind } from "../../types/api";
import { ghostButtonStyle, theme } from "../../theme";
import { useAddNode, useUpdateNode } from "../../queries/hooks";
import LegRow from "./LegRow";
import RouteNodeRow from "./RouteNodeRow";
import RouteAttachments from "./RouteAttachments";
import NodePicker from "./NodePicker";
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";

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

/** Fractional position for a node dragged from `fromIndex` to `toIndex`.
 * Computed against the list with the dragged node removed, so `toIndex` refers
 * to the slot among the remaining nodes. Returns null when nothing moves. */
export function computeDropPosition(nodes: RouteNode[], fromIndex: number, toIndex: number): number | null {
  if (fromIndex === toIndex) return null;
  const rest = nodes.filter((_, i) => i !== fromIndex);
  const before = rest[toIndex - 1];
  const after = rest[toIndex];
  if (!before) return after.position - 1;        // dropped at the very top
  if (!after) return before.position + 1;         // dropped at the very bottom
  return (before.position + after.position) / 2;  // between two neighbours
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = nodes.findIndex((n) => n.id === active.id);
    const to = nodes.findIndex((n) => n.id === over.id);
    if (from === -1 || to === -1) return;
    const pos = computeDropPosition(nodes, from, to);
    if (pos != null) updateNode.mutate({ nodeId: nodes[from].id, body: { position: pos } });
  }

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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
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
        </SortableContext>
      </DndContext>

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
