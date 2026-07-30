import { theme } from "../theme";

export default function AddFab({ onClick, mobile = false }: { onClick: () => void; mobile?: boolean }) {
  if (mobile) {
    // A round "+" pinned top-left — clear of the top-right map controls and the
    // bottom sheet below.
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Add place"
        className="hover-fab"
        style={{
          position: "fixed",
          left: 16,
          top: "calc(env(safe-area-inset-top, 0px) + 16px)",
          zIndex: 1500,
          width: 52,
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          borderRadius: "50%",
          background: theme.gradient.brand,
          color: "#fff",
          fontSize: 30,
          fontWeight: 700,
          lineHeight: 1,
          boxShadow: theme.shadow.fab,
          cursor: "pointer",
        }}
      >
        +
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover-fab"
      style={{ position: "absolute", right: 22, bottom: 22, zIndex: 700, padding: "14px 22px 14px 18px", border: "none", borderRadius: theme.radius.pill, background: theme.gradient.brand, color: "#fff", fontFamily: theme.font.ui, fontWeight: 700, fontSize: 14, boxShadow: theme.shadow.fab, cursor: "pointer" }}
    >
      + Add place
    </button>
  );
}
