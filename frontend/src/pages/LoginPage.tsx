import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthCard, AuthField } from "../components/AuthCard";

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
    <AuthCard ariaLabel="Log in" heading="MinimalPOI" onSubmit={onSubmit} submitLabel="Log in" error={error}>
      <AuthField id="login-username" label="Username" value={username} onChange={setUsername} />
      <AuthField id="login-password" label="Password" type="password" value={password} onChange={setPassword} />
    </AuthCard>
  );
}
