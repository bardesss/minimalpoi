// frontend/src/components/AddFab.tsx
import { theme } from "../theme";

export default function AddFab({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ position: "absolute", right: 22, bottom: 22, zIndex: 700, border: "none", borderRadius: theme.radius.pill, padding: "14px 22px 14px 18px", background: theme.gradient.brand, color: "#fff", fontFamily: theme.font.ui, fontWeight: 700, fontSize: 14, boxShadow: theme.shadow.fab, cursor: "pointer" }}>
      + Add place
    </button>
  );
}
