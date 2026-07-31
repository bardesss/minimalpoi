import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { setup as setupRequest } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { AuthCard, AuthField } from "../components/AuthCard";

export default function SetupPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await setupRequest(username, password);
      await signIn(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Setup failed");
    }
  }

  return (
    <AuthCard ariaLabel="First-run setup" heading="Create the admin account" onSubmit={onSubmit} submitLabel="Create account" error={error}>
      <AuthField id="setup-username" label="Username" value={username} onChange={setUsername} />
      <AuthField id="setup-password" label="Password" type="password" value={password} onChange={setPassword} />
    </AuthCard>
  );
}
