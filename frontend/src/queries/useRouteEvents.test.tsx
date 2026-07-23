import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { clientId } from "../lib/clientId";
import { useRouteEvents } from "./useRouteEvents";
import type { RouteDetail } from "../types/api";

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onmessage: ((e: { data: string }) => void) | null = null;
  onopen: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  closed = false;
  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }
  emit(data: string) {
    this.onmessage?.({ data });
  }
  open() {
    this.onopen?.({});
  }
  close() {
    this.closed = true;
  }
}

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function detail(over: Partial<RouteDetail> = {}): RouteDetail {
  return {
    id: 1, name: "T", start_date: "2026-07-14", end_date: null, round_trip: false,
    scheduled_end_date: "2026-07-14", node_count: 0, created_by: 1, owner_username: "a",
    team_id: null, team_name: null, can_edit: true, nodes: [], legs: [], attachments: [],
    total_distance_m: 0, total_duration_s: 0, ...over,
  } as RouteDetail;
}

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal("EventSource", MockEventSource);
});
afterEach(() => vi.unstubAllGlobals());

describe("useRouteEvents", () => {
  it("opens a stream for the route and closes on unmount", () => {
    const qc = new QueryClient();
    const { unmount } = renderHook(() => useRouteEvents(1), { wrapper: wrapper(qc) });
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe("/api/routes/1/events");
    unmount();
    expect(MockEventSource.instances[0].closed).toBe(true);
  });

  it("merges an update but preserves the viewer's own can_edit and attachments", () => {
    const qc = new QueryClient();
    qc.setQueryData(["routes", 1], detail({ can_edit: false, attachments: [{ id: 9 } as never] }));
    renderHook(() => useRouteEvents(1), { wrapper: wrapper(qc) });

    act(() => {
      MockEventSource.instances[0].emit(JSON.stringify({
        type: "update", client_id: "other",
        route: detail({ node_count: 3, can_edit: true, attachments: [] }),
      }));
    });

    const cached = qc.getQueryData<RouteDetail>(["routes", 1])!;
    expect(cached.node_count).toBe(3);       // remote change applied
    expect(cached.can_edit).toBe(false);     // own permission preserved
    expect(cached.attachments).toHaveLength(1); // own attachments preserved
  });

  it("ignores its own echo", () => {
    const qc = new QueryClient();
    qc.setQueryData(["routes", 1], detail({ node_count: 0 }));
    renderHook(() => useRouteEvents(1), { wrapper: wrapper(qc) });

    act(() => {
      MockEventSource.instances[0].emit(JSON.stringify({
        type: "update", client_id: clientId, route: detail({ node_count: 99 }),
      }));
    });

    expect(qc.getQueryData<RouteDetail>(["routes", 1])!.node_count).toBe(0);
  });

  it("buffers while suspended and flushes the latest on resume", () => {
    const qc = new QueryClient();
    qc.setQueryData(["routes", 1], detail({ node_count: 0 }));
    const { rerender } = renderHook(
      ({ s }: { s: boolean }) => useRouteEvents(1, { suspended: s }),
      { wrapper: wrapper(qc), initialProps: { s: true } },
    );

    act(() => {
      MockEventSource.instances[0].emit(JSON.stringify({ type: "update", client_id: "o", route: detail({ node_count: 1 }) }));
      MockEventSource.instances[0].emit(JSON.stringify({ type: "update", client_id: "o", route: detail({ node_count: 2 }) }));
    });
    expect(qc.getQueryData<RouteDetail>(["routes", 1])!.node_count).toBe(0); // buffered, not applied

    act(() => rerender({ s: false }));
    expect(qc.getQueryData<RouteDetail>(["routes", 1])!.node_count).toBe(2); // only the latest flushed
  });

  it("clears the cache and calls onDeleted on a deleted event", () => {
    const qc = new QueryClient();
    qc.setQueryData(["routes", 1], detail());
    const onDeleted = vi.fn();
    renderHook(() => useRouteEvents(1, { onDeleted }), { wrapper: wrapper(qc) });

    act(() => {
      MockEventSource.instances[0].emit(JSON.stringify({ type: "deleted", client_id: "o", route: null }));
    });

    expect(qc.getQueryData(["routes", 1])).toBeUndefined();
    expect(onDeleted).toHaveBeenCalledOnce();
  });

  it("invalidates the route detail on reconnect but not on the first open", () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const detailKey = (c: unknown[]) =>
      JSON.stringify((c[0] as { queryKey?: unknown })?.queryKey) === JSON.stringify(["routes", 1]);
    renderHook(() => useRouteEvents(1), { wrapper: wrapper(qc) });
    const es = MockEventSource.instances[0];

    act(() => es.open());   // first open — must NOT invalidate the detail key
    expect(spy.mock.calls.filter(detailKey)).toHaveLength(0);

    act(() => es.open());   // reconnect — must invalidate the detail key once
    expect(spy.mock.calls.filter(detailKey)).toHaveLength(1);
  });

  it("drops a buffered update when routeId changes while suspended (no cross-route clobber)", () => {
    const qc = new QueryClient();
    qc.setQueryData(["routes", 1], detail({ id: 1, node_count: 0 }));
    qc.setQueryData(["routes", 2], detail({ id: 2, node_count: 5 }));
    const { rerender } = renderHook(
      ({ id, s }: { id: number; s: boolean }) => useRouteEvents(id, { suspended: s }),
      { wrapper: wrapper(qc), initialProps: { id: 1, s: true } },
    );

    act(() => MockEventSource.instances[0].emit(
      JSON.stringify({ type: "update", client_id: "o", route: detail({ id: 1, node_count: 9 }) }),
    ));
    act(() => rerender({ id: 2, s: true }));
    act(() => rerender({ id: 2, s: false }));

    const r2 = qc.getQueryData<RouteDetail>(["routes", 2])!;
    expect(r2.id).toBe(2);
    expect(r2.node_count).toBe(5);
  });
});
