import { useMemo, useState } from "react";
import type { RouteDetail, RouteNode, RouteNodeCreate, RouteNodeKind } from "../../types/api";
import { ghostButtonStyle, theme } from "../../theme";
import { useAddNode, useUpdateNode, useUpdateRoute } from "../../queries/hooks";
import LegRow from "./LegRow";
import RouteNodeRow from "./RouteNodeRow";
import RouteAttachments from "./RouteAttachments";
import NodePicker from "./NodePicker";
import { DndContext, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { groupNodesByDay, placeInDay, dayOffsetForDrop } from "../../lib/routeDays";
import { sortableCollision } from "../../lib/routeCollision";
import { formatDayLabel } from "../../lib/formatDayLabel";
import DayHeader from "./DayHeader";
import { isDayPassed, todayIso } from "../../lib/dayState";
import { dayWaypoints, googleMapsDirUrl } from "../../lib/routeNav";
import NavigateDayModal from "./NavigateDayModal";

const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" } as const;

const dayCardStyle = {
  border: `1px solid ${theme.color.borderCard}`,
  borderRadius: theme.radius.card,
  padding: 12,
  marginBottom: 10,
} as const;

const emptyDayHint = { margin: "8px 0 0 36px", fontSize: 12.5, color: theme.color.textPlaceholder } as const;

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

export default function RouteTimeline({ route, canEdit, onHoverNode }: { route: RouteDetail; canEdit: boolean; onHoverNode?: (id: number | null) => void }) {
  const nodes = route.nodes;
  const legByPair = useMemo(() => {
    const m = new Map<string, RouteDetail["legs"][number]>();
    for (const l of route.legs) m.set(`${l.from_node_id}:${l.to_node_id}`, l);
    return m;
  }, [route.legs]);
  const startNode = nodes.find((n) => n.role === "start") ?? null;
  const endNode = nodes.find((n) => n.role === "end") ?? null;
  const middle = useMemo(() => nodes.filter((n) => n.role == null), [nodes]);
  const updateRoute = useUpdateRoute();
  const [pick, setPick] = useState<"start" | "end" | null>(null);
  const indexById = useMemo(() => new Map(middle.map((n, i) => [n.id, i])), [middle]);
  const dayGroups = useMemo(() => groupNodesByDay({ ...route, nodes: middle }), [route, middle]);

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

  // Mouse: a small drag threshold, so clicks on the row's nested buttons still
  // fire. Touch: a press-and-hold delay with a movement tolerance, so a finger
  // swipe scrolls the sheet and only a deliberate hold on the grip starts a
  // reorder — this is what kills the "fat finger" accidental drags on mobile.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = middle.findIndex((n) => n.id === active.id);
    const to = middle.findIndex((n) => n.id === over.id);
    if (from === -1 || to === -1) return;
    const pos = computeDropPosition(middle, from, to);
    if (pos == null) return;
    // Stops carry a day; recompute it for the drop target so day and order stay
    // consistent. Stays have no day_offset — move position only.
    if (middle[from].kind === "stop") {
      const day_offset = dayOffsetForDrop(route, dayGroups, middle[to].id, pos, middle[from].id);
      updateNode.mutate({ nodeId: middle[from].id, body: { position: pos, day_offset } });
    } else {
      updateNode.mutate({ nodeId: middle[from].id, body: { position: pos } });
    }
  }

  function submit(body: RouteNodeCreate) {
    addNode.mutate(body);
    setAdding(null);
  }

  function submitEndpoint(body: RouteNodeCreate) {
    addNode.mutate(body);
    setPick(null);
  }

  const startBlock = (
    <div style={{ marginBottom: 10 }}>
      <p style={sectionLabel}>Start</p>
      {startNode ? (
        <RouteNodeRow node={startNode} routeId={route.id} canEdit={canEdit} pinned onHover={onHoverNode} />
      ) : canEdit && pick === "start" ? (
        <NodePicker kind="stop" role="start" onCancel={() => setPick(null)} onSubmit={submitEndpoint} />
      ) : canEdit ? (
        <button type="button" style={{ ...ghostButtonStyle, padding: "6px 12px" }} onClick={() => setPick("start")}>+ Set start place</button>
      ) : null}
    </div>
  );

  const endBlock = (
    <div style={{ marginTop: 12 }}>
      <p style={sectionLabel}>End</p>
      {route.round_trip ? (
        <p style={{ margin: "0 0 6px", fontSize: 13, color: theme.color.textSecondary }}>
          Return to {startNode?.name ?? "start"}
        </p>
      ) : endNode ? (
        <RouteNodeRow node={endNode} routeId={route.id} canEdit={canEdit} pinned onHover={onHoverNode} />
      ) : canEdit && pick === "end" ? (
        <NodePicker kind="stop" role="end" onCancel={() => setPick(null)} onSubmit={submitEndpoint} />
      ) : canEdit ? (
        <button type="button" style={{ ...ghostButtonStyle, padding: "6px 12px" }} onClick={() => setPick("end")}>+ Set end place</button>
      ) : null}
      {canEdit && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12.5, color: theme.color.textBody }}>
          <input
            type="checkbox"
            checked={route.round_trip}
            onChange={(e) => updateRoute.mutate({ id: route.id, body: { round_trip: e.target.checked } })}
          />
          Round trip (return to start)
        </label>
      )}
    </div>
  );

  return (
    <div>
      <p style={sectionLabel}>Itinerary</p>
      {startBlock}
      {middle.length === 0 && (
        <p style={{ margin: "0 0 12px", fontSize: 13, color: theme.color.textPlaceholder }}>
          No stops yet. Add a stay or a stop to start building the route.
        </p>
      )}
      <DndContext sensors={sensors} collisionDetection={sortableCollision} onDragEnd={onDragEnd}>
        <SortableContext items={middle.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          {dayGroups.map((group, gi) => {
            const expanded = isExpanded(group.dayKey);
            const isPast = isDayPassed(group.dayKey, today);
            return (
              <div key={group.dayKey} data-testid="day-card" style={dayCardStyle}>
                <DayHeader
                  label={formatDayLabel(group.dayKey)}
                  dayNumber={gi + 1}
                  distance_m={group.driving_distance_m}
                  duration_s={group.driving_duration_s}
                  collapsed={!expanded}
                  muted={isPast}
                  stopCount={group.nodes.length}
                  onToggle={() => toggleDay(group.dayKey)}
                  onNavigate={() => navigateDay(gi)}
                />
                {expanded && group.nodes.length === 0 && <p style={emptyDayHint}>No stops yet.</p>}
                {expanded && group.nodes.map((n) => {
                  const i = indexById.get(n.id)!;
                  const prev = i > 0 ? middle[i - 1] : undefined;
                  const inbound = prev ? legByPair.get(`${prev.id}:${n.id}`) : undefined;
                  return (
                    <div key={n.id}>
                      {inbound && <LegRow leg={inbound} />}
                      <RouteNodeRow
                        node={n}
                        routeId={route.id}
                        canEdit={canEdit}
                        seq={(indexById.get(n.id) ?? 0) + 1}
                        onHover={onHoverNode}
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

      {endBlock}

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
