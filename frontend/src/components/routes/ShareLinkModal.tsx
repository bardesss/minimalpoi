import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RouteDetail, ShareInfo } from "../../types/api";
import { ghostButtonStyle, primaryButtonStyle, dangerButtonStyle, inputStyle, theme, toggleChipStyle } from "../../theme";
import ModalShell from "./ModalShell";
import { deleteShare, putShare, regenerateShare } from "../../api/share";

type ExpiryPreset = "never" | "7d" | "30d" | "custom";

const DAY_MS = 24 * 60 * 60 * 1000;

function isoInDays(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

function isoFromDateInput(value: string): string {
  // <input type="date"> gives "YYYY-MM-DD"; treat it as end-of-day UTC.
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

export default function ShareLinkModal({ route, onClose }: { route: RouteDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const [share, setShare] = useState<ShareInfo | null>(route.share ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState("");
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>(share?.expires_at ? "custom" : "never");
  const [customDate, setCustomDate] = useState(share?.expires_at ? share.expires_at.slice(0, 10) : "");

  const url = share ? `${window.location.origin}/s/${share.token}` : null;

  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
  }, []);

  /** Runs a share mutation; returns whether it succeeded, so callers can chain success-only side effects (e.g. clearing a form field) without also doing so on error. */
  async function run(action: () => Promise<ShareInfo | null>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      setShare(result);
      qc.invalidateQueries({ queryKey: ["routes", route.id] });
      return true;
    } catch {
      setError("Something went wrong. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function onCreate() {
    void run(() => putShare(route.id, {}));
  }

  function onRegenerate() {
    void run(() => regenerateShare(route.id));
  }

  function onRevoke() {
    void run(async () => {
      await deleteShare(route.id);
      return null;
    });
  }

  function onExpiryChange(preset: ExpiryPreset) {
    setExpiryPreset(preset);
    if (preset === "custom") return; // wait for the date picker
    const expires_at = preset === "never" ? null : preset === "7d" ? isoInDays(7) : isoInDays(30);
    void run(() => putShare(route.id, { expires_at }));
  }

  function onCustomDateChange(value: string) {
    setCustomDate(value);
    if (!value) return;
    void run(() => putShare(route.id, { expires_at: isoFromDateInput(value) }));
  }

  function onSetPassword() {
    if (!password) return;
    void run(() => putShare(route.id, { password })).then((ok) => {
      if (ok) setPassword("");
    });
  }

  function onRemovePassword() {
    void run(() => putShare(route.id, { remove_password: true }));
  }

  async function onCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (permissions/browser support) — URL is still shown for manual copy
    }
  }

  return (
    <ModalShell
      label="Public link"
      onClose={onClose}
      tint="dark"
      cardStyle={{ background: theme.color.surface0, borderRadius: theme.radius.modal, padding: 16, width: 420, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto" }}
    >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <strong style={{ fontFamily: theme.font.ui }}>Public link</strong>
          <button type="button" aria-label="Close" style={{ ...ghostButtonStyle, padding: "4px 10px" }} onClick={onClose}>×</button>
        </div>

        {error && <p role="status" style={{ fontSize: 13, color: theme.color.dangerText, marginTop: 0 }}>{error}</p>}

        {!share ? (
          <>
            <p style={{ fontSize: 13, color: theme.color.textSecondary, marginTop: 0 }}>
              Anyone with this link can view a read-only copy of this route.
            </p>
            <button type="button" style={primaryButtonStyle} onClick={onCreate} disabled={busy}>Create public link</button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input readOnly aria-label="Public link URL" value={url ?? ""} style={{ ...inputStyle, flex: 1 }} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" style={ghostButtonStyle} onClick={onCopy}>{copied ? "Copied" : "Copy"}</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" }}>Expires</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: expiryPreset === "custom" ? 8 : 0 }}>
                <button type="button" style={toggleChipStyle(expiryPreset === "never")} aria-pressed={expiryPreset === "never"} onClick={() => onExpiryChange("never")} disabled={busy}>Never</button>
                <button type="button" style={toggleChipStyle(expiryPreset === "7d")} aria-pressed={expiryPreset === "7d"} onClick={() => onExpiryChange("7d")} disabled={busy}>7 days</button>
                <button type="button" style={toggleChipStyle(expiryPreset === "30d")} aria-pressed={expiryPreset === "30d"} onClick={() => onExpiryChange("30d")} disabled={busy}>30 days</button>
                <button type="button" style={toggleChipStyle(expiryPreset === "custom")} aria-pressed={expiryPreset === "custom"} onClick={() => setExpiryPreset("custom")} disabled={busy}>Custom</button>
              </div>
              {expiryPreset === "custom" && (
                <input
                  type="date"
                  aria-label="Custom expiry date"
                  value={customDate}
                  onChange={(e) => onCustomDateChange(e.target.value)}
                  style={inputStyle}
                  disabled={busy}
                />
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="share-link-password" style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" }}>
                Password
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="share-link-password"
                  type="password"
                  placeholder={share.password_set ? "New password" : "Optional password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="button" style={ghostButtonStyle} onClick={onSetPassword} disabled={!password || busy}>
                  {share.password_set ? "Change" : "Set"}
                </button>
                {share.password_set && (
                  <button type="button" style={ghostButtonStyle} onClick={onRemovePassword} disabled={busy}>Remove</button>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
              <button type="button" style={ghostButtonStyle} onClick={onRegenerate} disabled={busy}>Regenerate</button>
              <button type="button" style={dangerButtonStyle} onClick={onRevoke} disabled={busy}>Revoke</button>
            </div>
          </>
        )}
    </ModalShell>
  );
}
