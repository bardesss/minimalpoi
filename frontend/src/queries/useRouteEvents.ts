import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { RouteDetail } from "../types/api";
import { clientId } from "../lib/clientId";

interface RouteEventEnvelope {
  type: "update" | "deleted";
  client_id: string | null;
  route: RouteDetail | null;
}

function applyUpdate(qc: QueryClient, routeId: number, incoming: RouteDetail) {
  qc.setQueryData<RouteDetail>(["routes", routeId], (prev) =>
    // Preserve the viewer's own can_edit/attachments. With no prior cache entry
    // (an update racing ahead of the initial REST fetch), don't trust the
    // broadcast's can_edit — it's the mutating editor's — nor its empty
    // attachments; force safe defaults until the refetch below settles the truth.
    prev
      ? { ...incoming, can_edit: prev.can_edit, attachments: prev.attachments }
      : { ...incoming, can_edit: false, attachments: [] },
  );
  qc.invalidateQueries({ queryKey: ["routes"] });
}

/** Subscribe to live updates for `routeId` while its detail is open. One-way
 * push; mutations still go through REST. Preserves the viewer's own can_edit /
 * attachments, suppresses self-echo, and buffers while `suspended`. */
export function useRouteEvents(
  routeId: number | null,
  opts: { suspended?: boolean; onDeleted?: () => void } = {},
): void {
  const qc = useQueryClient();
  const suspended = opts.suspended ?? false;
  const suspendedRef = useRef(suspended);
  // The buffer is tagged with the route it was captured for, so a flush can
  // never land under a different ["routes", id] key — even if `suspended`
  // lifts and `routeId` changes in the same commit (effect-order independent).
  const bufferRef = useRef<{ forRouteId: number; route: RouteDetail } | null>(null);
  const onDeletedRef = useRef(opts.onDeleted);
  onDeletedRef.current = opts.onDeleted;

  // Track suspension and flush the last buffered payload when it lifts.
  useEffect(() => {
    suspendedRef.current = suspended;
    const buffered = bufferRef.current;
    if (buffered && buffered.forRouteId !== routeId) {
      bufferRef.current = null;                 // buffer belongs to a route we left — drop it
    } else if (!suspended && buffered && routeId != null) {
      // `routeId != null` is a no-op at runtime here (buffered.forRouteId is always a
      // number, and the branch above already ruled out forRouteId !== routeId, so
      // routeId must equal it) — kept only so TS can narrow routeId for applyUpdate.
      applyUpdate(qc, routeId, buffered.route);
      bufferRef.current = null;
    }
  }, [suspended, qc, routeId]);

  useEffect(() => {
    if (routeId == null) return;
    const es = new EventSource(`/api/routes/${routeId}/events`, { withCredentials: true });
    let hasConnected = false;

    es.onopen = () => {
      if (hasConnected) qc.invalidateQueries({ queryKey: ["routes", routeId] }); // reconcile after a gap
      hasConnected = true;
    };
    es.onmessage = (e) => {
      let msg: RouteEventEnvelope;
      try {
        msg = JSON.parse(e.data) as RouteEventEnvelope;
      } catch {
        return;
      }
      if (msg.client_id && msg.client_id === clientId) return; // self-echo
      if (msg.type === "deleted") {
        bufferRef.current = null;               // don't let a buffered update resurrect it
        qc.removeQueries({ queryKey: ["routes", routeId] });
        qc.invalidateQueries({ queryKey: ["routes"] });
        onDeletedRef.current?.();
        return;
      }
      if (msg.type === "update" && msg.route) {
        if (suspendedRef.current) {
          bufferRef.current = { forRouteId: routeId, route: msg.route };
          return;
        }
        applyUpdate(qc, routeId, msg.route);
      }
    };

    return () => es.close();
  }, [routeId, qc]);
}
