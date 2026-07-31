import { useState } from "react";
import { useCreateTeam, useDeleteTeam, useSetPreferredTeam, useTeamCandidates, useTeams, useUpdateTeam } from "../../queries/hooks";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../Toast";
import type { Team } from "../../types/api";
import { dangerButtonStyle, ghostButtonStyle, inputStyle, primaryButtonStyle, theme, fieldLabelStyle } from "../../theme";


interface Draft { id: number | null; name: string; memberIds: number[]; }

export default function TeamsSection() {
  const teams = useTeams().data ?? [];
  const candidates = useTeamCandidates().data ?? [];
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const setPreferred = useSetPreferredTeam();
  const { user: me } = useAuth();
  const { notify } = useToast();

  const [draft, setDraft] = useState<Draft | null>(null);

  const canManage = (t: Team) => me?.role === "admin" || t.created_by === me?.id;
  const myTeams = teams.filter((t) => me != null && t.member_ids.includes(me.id));

  function toggleMember(id: number) {
    if (!draft) return;
    setDraft({ ...draft, memberIds: draft.memberIds.includes(id) ? draft.memberIds.filter((x) => x !== id) : [...draft.memberIds, id] });
  }

  async function save() {
    if (!draft || draft.name.trim() === "") return;
    const body = { name: draft.name.trim(), member_ids: draft.memberIds };
    try {
      if (draft.id == null) await createTeam.mutateAsync(body);
      else await updateTeam.mutateAsync({ id: draft.id, body });
      setDraft(null);
      notify("Team saved");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Save failed", "error");
    }
  }

  function remove(t: Team) {
    if (!confirm(`Delete team "${t.name}"?`)) return;
    deleteTeam.mutate(t.id, {
      onSuccess: () => notify("Team deleted"),
      onError: (e) => notify(e instanceof Error ? e.message : "Delete failed", "error"),
    });
  }

  function changePreferred(value: string) {
    const preferredTeamId = value === "" ? null : Number(value);
    setPreferred.mutate(preferredTeamId, {
      onSuccess: () => notify("Preferred team updated"),
      onError: (e) => notify(e instanceof Error ? e.message : "Update failed", "error"),
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {teams.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `1px solid ${theme.color.borderCard}`, borderRadius: theme.radius.input }}>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{t.name} <span style={{ color: theme.color.textPlaceholder, fontWeight: 500 }}>· {t.member_ids.length} member{t.member_ids.length === 1 ? "" : "s"}</span></span>
            {canManage(t) && <button type="button" onClick={() => setDraft({ id: t.id, name: t.name, memberIds: t.member_ids })} style={{ ...ghostButtonStyle, padding: "6px 12px" }}>Edit</button>}
            {canManage(t) && <button type="button" aria-label={`Delete ${t.name}`} onClick={() => remove(t)} style={{ ...dangerButtonStyle, padding: "6px 12px" }}>Delete</button>}
          </div>
        ))}
      </div>

      {draft ? (
        <div style={{ border: `1px solid ${theme.color.borderCard}`, borderRadius: theme.radius.card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={fieldLabelStyle} htmlFor="team-name">Team name</label><input id="team-name" style={inputStyle} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div>
            <span style={fieldLabelStyle}>Members</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {candidates.map((c) => (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <input type="checkbox" aria-label={`Member ${c.username}`} checked={draft.memberIds.includes(c.id)} onChange={() => toggleMember(c.id)} /> {c.username}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={() => setDraft(null)} style={ghostButtonStyle}>Cancel</button>
            <button type="button" onClick={save} style={primaryButtonStyle}>Save</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setDraft({ id: null, name: "", memberIds: me ? [me.id] : [] })} style={{ ...ghostButtonStyle, alignSelf: "flex-start" }}>+ Add team</button>
      )}

      <div style={{ borderTop: `1px solid ${theme.color.borderSubtle}`, paddingTop: 14 }}>
        <label style={fieldLabelStyle} htmlFor="pref-team">Preferred team <span style={{ color: theme.color.textPlaceholder, fontWeight: 500 }}>(visits count toward this team)</span></label>
        <select id="pref-team" style={{ ...inputStyle, maxWidth: 280 }} value={me?.preferred_team_id ?? ""} onChange={(e) => changePreferred(e.target.value)}>
          <option value="">None</option>
          {myTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
    </div>
  );
}
