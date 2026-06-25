import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw";
import { makeClient } from "../test/utils";
import { useCreatePoi, useEnrich, useImportPois, usePois } from "./hooks";

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
});
