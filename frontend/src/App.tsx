import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getSetupStatus } from "./api/auth";
import RequireAuth from "./auth/RequireAuth";
import AppShell from "./components/AppShell";
import LoginPage from "./pages/LoginPage";
import SetupPage from "./pages/SetupPage";

export default function App() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    getSetupStatus()
      .then((s) => setNeedsSetup(s.needs_setup))
      .catch(() => setNeedsSetup(false));
  }, []);

  // Block the initial render only for guarded routes while the first-run check
  // is in flight. /login and /setup need no setup-status to paint, so they
  // render immediately; if the instance actually needs setup, the redirect
  // below still fires once the status resolves.
  if (needsSetup === null && location.pathname !== "/login" && location.pathname !== "/setup") {
    return <p>Loading…</p>;
  }
  if (needsSetup && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }

  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
