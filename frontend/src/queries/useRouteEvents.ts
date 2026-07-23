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
    prev ? { ...incoming, can_edit: prev.can_edit, attachments: prev.attachments } : incoming,
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
  const bufferRef = useRef<RouteDetail | null>(null);
  const onDeletedRef = useRef(opts.onDeleted);
  onDeletedRef.current = opts.onDeleted;

  // Track suspension and flush the last buffered payload when it lifts.
  useEffect(() => {
    suspendedRef.current = suspended;
    if (!suspended && bufferRef.current && routeId != null) {
      applyUpdate(qc, routeId, bufferRef.current);
      bufferRef.current = null;
    }
  }, [suspended, qc, routeId]);

  useEffect(() => {
    if (routeId == null) return;
    // New route id: drop any payload buffered for the previous route so a
    // pending flush can never land under the wrong ["routes", id] key.
    bufferRef.current = null;
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
        qc.removeQueries({ queryKey: ["routes", routeId] });
        qc.invalidateQueries({ queryKey: ["routes"] });
        onDeletedRef.current?.();
        return;
      }
      if (msg.type === "update" && msg.route) {
        if (suspendedRef.current) {
          bufferRef.current = msg.route;
          return;
        }
        applyUpdate(qc, routeId, msg.route);
      }
    };

    return () => es.close();
  }, [routeId, qc]);
}
