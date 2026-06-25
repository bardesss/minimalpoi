import type { Team, TeamCandidate, TeamCreate, UserRead } from "../types/api";
import { apiFetch } from "./client";

export function getTeams(): Promise<Team[]> {
  return apiFetch<Team[]>("/api/teams");
}

export function getTeamCandidates(): Promise<TeamCandidate[]> {
  return apiFetch<TeamCandidate[]>("/api/teams/candidates");
}

export function createTeam(body: TeamCreate): Promise<Team> {
  return apiFetch<Team>("/api/teams", { method: "POST", body: JSON.stringify(body) });
}

export function updateTeam(id: number, body: TeamCreate): Promise<Team> {
  return apiFetch<Team>(`/api/teams/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteTeam(id: number): Promise<void> {
  return apiFetch<void>(`/api/teams/${id}`, { method: "DELETE" });
}

export function setPreferredTeam(preferred_team_id: number | null): Promise<UserRead> {
  return apiFetch<UserRead>("/api/auth/me/preferences", {
    method: "PATCH",
    body: JSON.stringify({ preferred_team_id }),
  });
}
