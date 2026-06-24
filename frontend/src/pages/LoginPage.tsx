import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { inputStyle, primaryButtonStyle, theme } from "../theme";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await signIn(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: theme.color.pageBg }}>
      <form
        onSubmit={onSubmit}
        aria-label="Log in"
        style={{ width: 360, background: theme.color.surface0, border: `1px solid ${theme.color.borderSubtle}`, borderRadius: theme.radius.modal, padding: "28px 26px", display: "flex", flexDirection: "column", gap: 14, boxShadow: theme.shadow.legend }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: theme.radius.logo, background: theme.gradient.brand, boxShadow: "0 3px 10px rgba(79,70,229,.4)" }} />
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>MinimalPOI</h1>
        </div>
        <label htmlFor="login-username" style={{ fontSize: 12, fontWeight: 700, color: theme.color.textBody }}>Username</label>
        <input id="login-username" style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} />
        <label htmlFor="login-password" style={{ fontSize: 12, fontWeight: 700, color: theme.color.textBody }}>Password</label>
        <input id="login-password" type="password" style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" style={{ margin: 0, color: theme.color.dangerText, fontSize: 13 }}>{error}</p>}
        <button type="submit" style={{ ...primaryButtonStyle, marginTop: 4 }}>Log in</button>
      </form>
    </div>
  );
}
