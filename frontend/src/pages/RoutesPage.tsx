import { theme } from "../theme";

// Stub — the full map-primary editor is built in Task 11/12.
export default function RoutesPage() {
  return (
    <div style={{ height: "100vh", width: "100vw", background: theme.color.pageBg, padding: 24 }}>
      <h1 style={{ fontFamily: theme.font.ui, color: theme.color.textPrimary }}>Routes</h1>
    </div>
  );
}
