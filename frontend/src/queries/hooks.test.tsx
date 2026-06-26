import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { makeClient } from "../test/utils";
import { useComments, useCreatePoi, useEnrich, useImportPois, usePois, useSyncConflicts, useSyncStatus, useTags, useUsers, useTeams, useVisits } from "./hooks";

function wrapper(client = makeClient()) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("data hooks", () => {
  it("usePois loads the list", async () => {
    const { result } = renderHook(() => usePois(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it("useCreatePoi invalidates ['pois'] so the list refetches", async () => {
    const client = makeClient();
    let getCount = 0;
    server.use(
      http.get("/api/pois", () => {
        getCount += 1;
        return HttpResponse.json([]);
      }),
      http.post("/api/pois", () => HttpResponse.json({ id: 3, name: "X" }, { status: 201 })),
    );
    const pois = renderHook(() => usePois(), { wrapper: wrapper(client) });
    await waitFor(() => expect(pois.result.current.isSuccess).toBe(true));
    const mut = renderHook(() => useCreatePoi(), { wrapper: wrapper(client) });
    await mut.result.current.mutateAsync({ name: "X", lat: 1, lng: 2 });
    await waitFor(() => expect(getCount).toBeGreaterThanOrEqual(2));
  });

  it("useEnrich returns a draft for a url", async () => {
    server.use(
      http.post("/api/enrich", () =>
        HttpResponse.json({
          name: "Stub", address: null, lat: 1, lng: 2, image_url: null,
          description: null, phone: null, website: null, source_url: "https://x.example",
          field_sources: { lat: "gmaps_url" },
        }),
      ),
    );
    const { result } = renderHook(() => useEnrich(), { wrapper: wrapper() });
    const draft = await result.current.mutateAsync("https://x.example");
    expect(draft.name).toBe("Stub");
    expect(draft.field_sources.lat).toBe("gmaps_url");
  });

  it("useImportPois invalidates ['pois']", async () => {
    const client = makeClient();
    let getCount = 0;
    server.use(
      http.get("/api/pois", () => {
        getCount += 1;
        return HttpResponse.json([]);
      }),
      http.post("/api/pois/import", () =>
        HttpResponse.json({ created: 1, skipped: 0, errors: [], created_ids: [5] }),
      ),
    );
    const pois = renderHook(() => usePois(), { wrapper: wrapper(client) });
    await waitFor(() => expect(pois.result.current.isSuccess).toBe(true));
    const mut = renderHook(() => useImportPois(), { wrapper: wrapper(client) });
    await mut.result.current.mutateAsync(new File(["x"], "p.csv", { type: "text/csv" }));
    await waitFor(() => expect(getCount).toBeGreaterThanOrEqual(2));
  });

  it("useTags loads tags", async () => {
    server.use(http.get("/api/tags", () => HttpResponse.json([{ tag: "food", count: 2 }])));
    const { result } = renderHook(() => useTags(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ tag: "food", count: 2 }]);
  });

  it("useUsers loads the user list", async () => {
    server.use(http.get("/api/users", () => HttpResponse.json([{ id: 1, username: "admin", role: "admin", preferred_team_id: null, disabled: false, created_at: "2026-06-25T00:00:00Z" }])));
    const { result } = renderHook(() => useUsers(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].username).toBe("admin");
  });

  it("useTeams loads the team list", async () => {
    server.use(http.get("/api/teams", () => HttpResponse.json([{ id: 1, name: "Crew", created_by: 1, member_ids: [1] }])));
    const { result } = renderHook(() => useTeams(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("Crew");
  });

  it("useVisits loads visits for a poi", async () => {
    server.use(http.get("/api/pois/1/visits", () => HttpResponse.json([{ poi_id: 1, user_id: 1, team_id: null, rating: 4 }])));
    const { result } = renderHook(() => useVisits(1), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].rating).toBe(4);
  });

  it("useComments loads comments for a poi", async () => {
    server.use(http.get("/api/pois/1/comments", () => HttpResponse.json([{ id: 1, poi_id: 1, user_id: 1, username: "admin", text: "hi", created_at: "2026-06-26T00:00:00Z" }])));
    const { result } = renderHook(() => useComments(1), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].text).toBe("hi");
  });

  it("useSyncStatus loads status", async () => {
    server.use(http.get("/api/sync/status", () => HttpResponse.json({ enabled: true, last_run: null, error_count: 0, conflict_count: 2 })));
    const { result } = renderHook(() => useSyncStatus(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.conflict_count).toBe(2);
  });

  it("useSyncConflicts loads the conflict list", async () => {
    server.use(http.get("/api/sync/conflicts", () => HttpResponse.json([{ entity_type: "place", id: 1, name: "Cafe", trip_id: 5, status: "conflict", last_error: null }])));
    const { result } = renderHook(() => useSyncConflicts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("Cafe");
  });
});
