import { theme } from "../theme";
import BrandLogo from "./BrandLogo";

// Full-screen branded splash shown while the first-run/setup check and the
// auth check are in flight, replacing the bare "Loading…" text that used to
// flash before the shell paints. Uses `position: fixed` so it covers the
// viewport regardless of where in the tree it renders (App root vs. RequireAuth).
export default function AppLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        background: theme.color.pageBg,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <BrandLogo size={38} />
        <span style={{ fontFamily: theme.font.ui, fontSize: 17, fontWeight: 800, letterSpacing: "-.02em", color: theme.color.textPrimary }}>
          MinimalPOI
        </span>
      </div>
      <div className="app-spinner" aria-hidden />
    </div>
  );
}
