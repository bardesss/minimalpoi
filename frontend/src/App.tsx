import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getSetupStatus } from "./api/auth";
import { useAuth } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import AppLoading from "./components/AppLoading";
import AppShell from "./components/AppShell";
import LoginPage from "./pages/LoginPage";
import PublicRoutePage from "./pages/PublicRoutePage";
import RoutesPage from "./pages/RoutesPage";
import SetupPage from "./pages/SetupPage";

export default function App() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    getSetupStatus()
      .then((s) => setNeedsSetup(s.needs_setup))
      .catch(() => setNeedsSetup(false));
  }, []);

  // Block the initial render only for guarded routes while the first-run check
  // is in flight. /login and /setup need no setup-status to paint, so they
  // render immediately; if the instance actually needs setup, the redirect
  // below still fires once the status resolves.
  if (
    needsSetup === null &&
    location.pathname !== "/login" &&
    location.pathname !== "/setup" &&
    !location.pathname.startsWith("/s/")
  ) {
    return <AppLoading />;
  }
  // Only force first-run setup when no admin exists yet. An authenticated user
  // means setup is already done, so don't bounce them back to /setup even if the
  // once-fetched needs_setup value is now stale (e.g. right after completing setup).
  // Public share links (/s/:token) are exempt too — they're meant to render for
  // anonymous visitors even on a freshly installed, not-yet-set-up instance.
  if (needsSetup && !user && location.pathname !== "/setup" && !location.pathname.startsWith("/s/")) {
    return <Navigate to="/setup" replace />;
  }

  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/s/:token" element={<PublicRoutePage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      />
      <Route
        path="/routes"
        element={
          <RequireAuth>
            <RoutesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/routes/:id"
        element={
          <RequireAuth>
            <RoutesPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
