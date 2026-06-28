import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCategory, deleteCategory, getCategories, updateCategory } from "../api/categories";
import { checkDuplicate, createPoi, deletePoi, getPois, updatePoi } from "../api/pois";
import { getFullSettings, getSettings, updateSettings } from "../api/settings";
import { deleteTag, getTags, renameTag } from "../api/tags";
import type { CategoryCreate, CategoryUpdate, CommentCreate, PoiCreate, PoiUpdate, SettingsUpdate, SyncResolve, UserCreate, UserUpdate, TeamCreate, VisitUpsert } from "../types/api";
import { addComment, deleteComment, deleteVisit, getComments, getVisits, upsertVisit } from "../api/poiActions";
import { getConflicts, getSyncStatus, resolveConflict, syncNow } from "../api/sync";
import { enrichUrl } from "../api/enrich";
import { getPlaceDraft, searchPlaces } from "../api/places";
import { importPois } from "../api/portability";
import { getVersion } from "../api/version";
import { createUser, deleteUser, getUsers, updateUser } from "../api/users";
import { createTeam, deleteTeam, getTeamCandidates, getTeams, setPreferredTeam, updateTeam } from "../api/teams";
import { useAuth } from "../auth/AuthContext";

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

export function useEnrich() {
  return useMutation({ mutationFn: (url: string) => enrichUrl(url) });
}

export function useSearchPlaces() {
  return useMutation({ mutationFn: (query: string) => searchPlaces(query) });
}

export function usePlaceDraft() {
  return useMutation({ mutationFn: (placeId: string) => getPlaceDraft(placeId) });
}

export function useImportPois() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importPois(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pois"] }),
  });
}

export function useFullSettings() {
  return useQuery({ queryKey: ["settings", "full"], queryFn: getFullSettings });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsUpdate) => updateSettings(patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "full"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CategoryCreate) => createCategory(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CategoryUpdate }) => updateCategory(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["pois"] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["pois"] });
    },
  });
}

export function useTags() {
  return useQuery({ queryKey: ["tags"], queryFn: getTags });
}

export function useRenameTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ oldTag, newTag }: { oldTag: string; newTag: string }) => renameTag(oldTag, newTag),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["pois"] });
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tag: string) => deleteTag(tag),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["pois"] });
    },
  });
}

export function useVersion() {
  return useQuery({ queryKey: ["version"], queryFn: getVersion, staleTime: 60 * 60 * 1000 });
}

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: getUsers });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UserCreate) => createUser(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UserUpdate }) => updateUser(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useTeams() {
  return useQuery({ queryKey: ["teams"], queryFn: getTeams });
}

export function useTeamCandidates() {
  return useQuery({ queryKey: ["teams", "candidates"], queryFn: getTeamCandidates });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TeamCreate) => createTeam(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: TeamCreate }) => updateTeam(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTeam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
}

export function useSetPreferredTeam() {
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: (preferredTeamId: number | null) => setPreferredTeam(preferredTeamId),
    onSuccess: () => refreshUser(),
  });
}

export function useVisits(poiId: number) {
  return useQuery({ queryKey: ["visits", poiId], queryFn: () => getVisits(poiId) });
}
export function useUpsertVisit(poiId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: VisitUpsert) => upsertVisit(poiId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["visits", poiId] }),
  });
}
export function useDeleteVisit(poiId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteVisit(poiId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["visits", poiId] }),
  });
}

export function useComments(poiId: number) {
  return useQuery({ queryKey: ["comments", poiId], queryFn: () => getComments(poiId) });
}
export function useAddComment(poiId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CommentCreate) => addComment(poiId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", poiId] }),
  });
}
export function useDeleteComment(poiId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => deleteComment(poiId, commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", poiId] }),
  });
}

export function useSyncStatus() {
  return useQuery({ queryKey: ["sync", "status"], queryFn: getSyncStatus });
}

export function useSyncConflicts() {
  return useQuery({ queryKey: ["sync", "conflicts"], queryFn: getConflicts });
}

function invalidateSync(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["sync", "status"] });
  qc.invalidateQueries({ queryKey: ["sync", "conflicts"] });
  qc.invalidateQueries({ queryKey: ["pois"] });
  qc.invalidateQueries({ queryKey: ["categories"] });
}

export function useResolveConflict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SyncResolve) => resolveConflict(body),
    onSuccess: () => invalidateSync(qc),
  });
}

export function useSyncNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncNow(),
    onSuccess: () => invalidateSync(qc),
  });
}
