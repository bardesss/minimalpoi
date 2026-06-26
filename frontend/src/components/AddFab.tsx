// frontend/src/components/AddFab.tsx
import { theme } from "../theme";

export default function AddFab({ onClick, mobile = false }: { onClick: () => void; mobile?: boolean }) {
  // On mobile float above the bottom sheet's peek strip (≈30vh) and over it.
  const placement = mobile
    ? ({ position: "fixed", right: 16, bottom: "calc(30vh + 14px)", zIndex: 1500, padding: "14px 20px" } as const)
    : ({ position: "absolute", right: 22, bottom: 22, zIndex: 700, padding: "14px 22px 14px 18px" } as const);
  return (
    <button type="button" onClick={onClick} style={{ ...placement, border: "none", borderRadius: theme.radius.pill, background: theme.gradient.brand, color: "#fff", fontFamily: theme.font.ui, fontWeight: 700, fontSize: 14, boxShadow: theme.shadow.fab, cursor: "pointer" }}>
      + Add place
    </button>
  );
}
