import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function HomePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div>
      <h1>MinimalPOI</h1>
      <p>Signed in as {user?.username}</p>
      <button onClick={onLogout}>Log out</button>
    </div>
  );
}
