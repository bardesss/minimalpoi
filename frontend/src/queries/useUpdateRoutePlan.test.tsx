import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateRoutePlan } from "./hooks";

const updateRoute = vi.fn();
const updateNode = vi.fn();
const addNode = vi.fn();
vi.mock("../api/routes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/routes")>()),
  updateRoute: (...a: unknown[]) => updateRoute(...a),
  updateNode: (...a: unknown[]) => updateNode(...a),
  addNode: (...a: unknown[]) => addNode(...a),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => { updateRoute.mockReset(); updateNode.mockReset(); addNode.mockReset(); });

describe("useUpdateRoutePlan", () => {
  it("patches the route and relocates an existing start and end (round trip off)", async () => {
    const detail = { id: 1, nodes: [] };
    updateRoute.mockResolvedValue(detail);
    updateNode.mockResolvedValue(detail);
    const { result } = renderHook(() => useUpdateRoutePlan(), { wrapper });
    await result.current.mutateAsync({
      id: 1,
      route: { name: "Trip", start_date: "2026-07-14" },
      roundTrip: false,
      start: { kind: "stop", poi_id: 7 },
      end: { kind: "stop", name: "Finish", lat: 9, lng: 9 },
      startNodeId: 10,
      endNodeId: 20,
    });
    await waitFor(() => expect(updateRoute).toHaveBeenCalledWith(1, expect.objectContaining({ round_trip: false, name: "Trip" })));
    expect(updateNode).toHaveBeenCalledWith(1, 10, { poi_id: 7 });
    expect(updateNode).toHaveBeenCalledWith(1, 20, { name: "Finish", lat: 9, lng: 9 });
    expect(addNode).not.toHaveBeenCalled();
  });

  it("adds a start when none exists and skips the end on a round trip", async () => {
    const detail = { id: 1, nodes: [] };
    updateRoute.mockResolvedValue(detail);
    addNode.mockResolvedValue(detail);
    const { result } = renderHook(() => useUpdateRoutePlan(), { wrapper });
    await result.current.mutateAsync({
      id: 1,
      route: { name: "Trip", start_date: "2026-07-14" },
      roundTrip: true,
      start: { kind: "stop", poi_id: 7 },
      end: null,
      startNodeId: null,
      endNodeId: null,
    });
    await waitFor(() => expect(addNode).toHaveBeenCalledWith(1, { kind: "stop", poi_id: 7, role: "start" }));
    expect(updateNode).not.toHaveBeenCalled();
  });
});
