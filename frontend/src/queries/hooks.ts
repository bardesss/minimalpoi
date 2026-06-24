import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCategories } from "../api/categories";
import { checkDuplicate, createPoi, deletePoi, getPois, updatePoi } from "../api/pois";
import { getSettings } from "../api/settings";
import type { PoiCreate, PoiUpdate } from "../types/api";

export function usePois() {
  return useQuery({ queryKey: ["pois"], queryFn: getPois });
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: getCategories });
}

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: getSettings });
}

export function useCreatePoi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PoiCreate) => createPoi(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pois"] }),
  });
}

export function useUpdatePoi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: PoiUpdate }) => updatePoi(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pois"] }),
  });
}

export function useDeletePoi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePoi(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pois"] }),
  });
}

export function useCheckDuplicate() {
  return useMutation({ mutationFn: checkDuplicate });
}
