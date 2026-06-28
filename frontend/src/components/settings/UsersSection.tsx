import { useState } from "react";
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from "../../queries/hooks";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../Toast";
import type { Role, UserRead } from "../../types/api";
import { dangerButtonStyle, ghostButtonStyle, inputStyle, primaryButtonStyle, theme } from "../../theme";

const label = { fontSize: 12, fontWeight: 700, color: theme.color.textBody, marginBottom: 6, display: "block" } as const;

export default function UsersSection() {
  const users = useUsers().data ?? [];
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const { user: me } = useAuth();
  const { notify } = useToast();

  const adminCount = users.filter((u) => u.role === "admin" && !u.disabled).length;
  const isOnlyAdmin = (u: UserRead) => u.role === "admin" && adminCount <= 1;

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newRole, setNewRole] = useState<Role>("member");
  const [error, setError] = useState<string | null>(null);
  const [resetFor, setResetFor] = useState<number | null>(null);
  const [resetPass, setResetPass] = useState("");

  async function create() {
    setError(null);
    if (newName.trim() === "" || newPass === "") return;
    try {
      await createUser.mutateAsync({ username: newName.trim(), password: newPass, role: newRole });
      setAdding(false); setNewName(""); setNewPass(""); setNewRole("member");
      notify("User created");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create user";
      setError(msg);
      notify(msg, "error");
    }
  }

  async function patch(u: UserRead, body: { role?: Role; disabled?: boolean }) {
    setError(null);
    try {
      await updateUser.mutateAsync({ id: u.id, body });
      notify("User updated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Update failed";
      setError(msg);
      notify(msg, "error");
    }
  }

  async function saveReset(u: UserRead) {
    if (resetPass === "") return;
    setError(null);
    try {
      await updateUser.mutateAsync({ id: u.id, body: { password: resetPass } });
      setResetFor(null); setResetPass("");
      notify("Password reset");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Reset failed";
      setError(msg);
      notify(msg, "error");
    }
  }

  async function remove(u: UserRead) {
    setError(null);
    if (!confirm(`Delete user "${u.username}"? This removes their visits and comments.`)) return;
    try {
      await deleteUser.mutateAsync(u.id);
      notify("User deleted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      setError(msg);
      notify(msg, "error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error && <div role="alert" style={{ fontSize: 12.5, color: theme.color.dangerText }}>{error}</div>}
      {users.map((u) => {
        const locked = isOnlyAdmin(u);
        return (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `1px solid ${theme.color.borderCard}`, borderRadius: theme.radius.input, flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 90, fontSize: 13.5, fontWeight: 700 }}>{u.username}{u.id === me?.id && <span style={{ color: theme.color.textPlaceholder, fontWeight: 500 }}> (you)</span>}</span>
            <select aria-label={`Role for ${u.username}`} value={u.role} disabled={locked} onChange={(e) => patch(u, { role: e.target.value as Role })} style={{ ...inputStyle, width: "auto", padding: "6px 8px" }}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="button" onClick={() => patch(u, { disabled: !u.disabled })} disabled={locked && !u.disabled} style={{ ...ghostButtonStyle, padding: "6px 12px" }}>{u.disabled ? "Enable" : "Disable"}</button>
            <button type="button" onClick={() => { setResetFor(resetFor === u.id ? null : u.id); setResetPass(""); }} style={{ ...ghostButtonStyle, padding: "6px 12px" }}>Reset password</button>
            <button type="button" aria-label={`Delete ${u.username}`} onClick={() => remove(u)} disabled={locked} style={{ ...dangerButtonStyle, padding: "6px 12px", opacity: locked ? 0.5 : 1 }}>Delete</button>
            {resetFor === u.id && (
              <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 6 }}>
                <input aria-label={`New password for ${u.username}`} type="password" style={{ ...inputStyle, flex: 1 }} value={resetPass} onChange={(e) => setResetPass(e.target.value)} placeholder="New password" />
                <button type="button" onClick={() => saveReset(u)} style={{ ...primaryButtonStyle, padding: "6px 14px" }}>Save</button>
              </div>
            )}
          </div>
        );
      })}

      {adding ? (
        <div style={{ border: `1px solid ${theme.color.borderCard}`, borderRadius: theme.radius.card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={label} htmlFor="nu-name">Username</label><input id="nu-name" style={inputStyle} value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
          <div><label style={label} htmlFor="nu-pass">Password</label><input id="nu-pass" type="password" style={inputStyle} value={newPass} onChange={(e) => setNewPass(e.target.value)} /></div>
          <div><label style={label} htmlFor="nu-role">Role</label>
            <select id="nu-role" style={inputStyle} value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={() => { setAdding(false); setError(null); }} style={ghostButtonStyle}>Cancel</button>
            <button type="button" onClick={create} style={primaryButtonStyle}>Create</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} style={{ ...ghostButtonStyle, alignSelf: "flex-start" }}>+ Add user</button>
      )}
    </div>
  );
}
