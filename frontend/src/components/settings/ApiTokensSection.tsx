import { useState } from "react";
import { useCreateToken, useRevokeToken, useTokens } from "../../queries/hooks";
import { useToast } from "../Toast";
import type { ApiTokenCreated } from "../../types/api";
import { dangerButtonStyle, inputStyle, monoInputStyle, primaryButtonStyle, theme, fieldLabelStyle } from "../../theme";


function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString();
}

export default function ApiTokensSection() {
  const tokens = useTokens().data ?? [];
  const createToken = useCreateToken();
  const revokeToken = useRevokeToken();
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [revealed, setRevealed] = useState<ApiTokenCreated | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    if (name.trim() === "") return;
    try {
      const created = await createToken.mutateAsync(name.trim());
      setName("");
      setRevealed(created);
      setCopied(false);
      notify("Token created");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not create token", "error");
    }
  }

  function remove(id: number, tokenName: string) {
    if (!confirm(`Revoke the "${tokenName}" token? Anything using it will stop working.`)) return;
    revokeToken.mutate(id, {
      onSuccess: () => notify("Token revoked"),
      onError: (e) => notify(e instanceof Error ? e.message : "Revoke failed", "error"),
    });
  }

  async function copyToken() {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.token);
      setCopied(true);
    } catch {
      // clipboard unavailable (permissions/browser support) — token is still shown for manual copy
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 13, color: theme.color.textSecondary, margin: 0 }}>
        API tokens let external tools (like an MCP client) act on your behalf. Keep them secret.
      </p>

      {revealed && (
        <div style={{ border: `1px solid ${theme.color.tintBorder}`, background: theme.color.tintBg, borderRadius: theme.radius.card, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: theme.color.deepIndigoText }}>
            Copy this token now — it won&apos;t be shown again.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code style={{ ...monoInputStyle, flex: 1, display: "block", wordBreak: "break-all" }}>{revealed.token}</code>
            <button type="button" onClick={copyToken} style={{ ...primaryButtonStyle, padding: "6px 14px", flexShrink: 0 }}>{copied ? "Copied" : "Copy"}</button>
          </div>
          <button type="button" onClick={() => setRevealed(null)} style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, fontSize: 12, fontWeight: 700, color: theme.color.textSecondary, cursor: "pointer" }}>
            Done
          </button>
        </div>
      )}

      {tokens.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.color.textSecondary, margin: 0 }}>No API tokens yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tokens.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `1px solid ${theme.color.borderCard}`, borderRadius: theme.radius.input, flexWrap: "wrap" }}>
              <span style={{ flex: 1, minWidth: 100, fontSize: 13.5, fontWeight: 700 }}>{t.name}</span>
              <span style={{ fontSize: 12, color: theme.color.textSecondary, fontFamily: theme.font.mono }}>{t.prefix}…</span>
              <span style={{ fontSize: 11.5, color: theme.color.textPlaceholder }}>Created {formatDate(t.created_at)}</span>
              <span style={{ fontSize: 11.5, color: theme.color.textPlaceholder }}>Last used {formatDate(t.last_used_at)}</span>
              <button type="button" aria-label={`Revoke ${t.name}`} onClick={() => remove(t.id, t.name)} style={{ ...dangerButtonStyle, padding: "6px 12px" }}>Revoke</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={fieldLabelStyle} htmlFor="new-token-name">Token name</label>
          <input id="new-token-name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Claude Desktop" />
        </div>
        <button type="button" onClick={create} disabled={name.trim() === "" || createToken.isPending} style={{ ...primaryButtonStyle, opacity: name.trim() === "" || createToken.isPending ? 0.5 : 1 }}>
          Create token
        </button>
      </div>
    </div>
  );
}
