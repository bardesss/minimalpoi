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
import { groupNodesByDay, placeInDay } from "../../lib/routeDays";
import { formatDayLabel } from "../../lib/formatDayLabel";
import DayHeader from "./DayHeader";
import { isDayPassed, todayIso } from "../../lib/dayState";
import { dayWaypoints, googleMapsDirUrl } from "../../lib/routeNav";
import NavigateDayModal from "./NavigateDayModal";

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
  const indexById = useMemo(() => new Map(nodes.map((n, i) => [n.id, i])), [nodes]);
  const dayGroups = useMemo(() => groupNodesByDay(route), [route]);

  const [today] = useState(todayIso);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [navIndex, setNavIndex] = useState<number | null>(null);

  const isExpanded = (dayKey: string) => overrides[dayKey] ?? !isDayPassed(dayKey, today);
  const toggleDay = (dayKey: string) => setOverrides((o) => ({ ...o, [dayKey]: !isExpanded(dayKey) }));

  async function navigateDay(gi: number) {
    const pts = dayWaypoints(dayGroups, gi);
    if (pts.length === 0) return;
    const label = formatDayLabel(dayGroups[gi].dayKey);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: label, text: `${label}: ${pts.map((p) => p.name).join(" → ")}`, url: googleMapsDirUrl(pts) });
      } catch {
        /* user dismissed the share sheet */
      }
      return;
    }
    setNavIndex(gi);
  }

  const addNode = useAddNode(route.id);
  const updateNode = useUpdateNode(route.id);

  const [adding, setAdding] = useState<RouteNodeKind | null>(null);
  const [dayAdding, setDayAdding] = useState<number | null>(null);

  function submitDay(body: RouteNodeCreate, gi: number) {
    const { position, day_offset } = placeInDay(route, dayGroups, gi);
    addNode.mutate({ ...body, position, day_offset });
    setDayAdding(null);
  }

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
          {dayGroups.map((group, gi) => {
            const expanded = isExpanded(group.dayKey);
            return (
              <div key={group.dayKey}>
                <DayHeader
                  label={formatDayLabel(group.dayKey)}
                  distance_m={group.driving_distance_m}
                  duration_s={group.driving_duration_s}
                  isFirst={gi === 0}
                  collapsed={!expanded}
                  stopCount={group.nodes.length}
                  onToggle={() => toggleDay(group.dayKey)}
                  onNavigate={() => navigateDay(gi)}
                />
                {expanded && group.nodes.map((n) => {
                  const i = indexById.get(n.id)!;
                  const prev = i > 0 ? nodes[i - 1] : undefined;
                  const inbound = prev ? legByPair.get(`${prev.id}:${n.id}`) : undefined;
                  return (
                    <div key={n.id}>
                      {inbound && <LegRow leg={inbound} />}
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
                    </div>
                  );
                })}
                {expanded && canEdit && (
                  <div style={{ margin: "4px 0 0 36px" }}>
                    {dayAdding === gi ? (
                      <NodePicker kind="stop" onCancel={() => setDayAdding(null)} onSubmit={(b) => submitDay(b, gi)} />
                    ) : (
                      <button
                        type="button"
                        aria-label={`Add stop to ${formatDayLabel(group.dayKey)}`}
                        style={{ ...ghostButtonStyle, padding: "4px 10px", fontSize: 12 }}
                        onClick={() => setDayAdding(gi)}
                      >
                        + Add stop
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </SortableContext>
      </DndContext>

      {navIndex !== null && (
        <NavigateDayModal
          dayLabel={formatDayLabel(dayGroups[navIndex].dayKey)}
          waypoints={dayWaypoints(dayGroups, navIndex)}
          onClose={() => setNavIndex(null)}
        />
      )}

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
