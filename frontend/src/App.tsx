import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getSetupStatus } from "./api/auth";
import RequireAuth from "./auth/RequireAuth";
import HomePage from "./pages/HomePage";
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
            <HomePage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
