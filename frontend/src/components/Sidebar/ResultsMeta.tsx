import { theme } from "../../theme";

export default function ResultsMeta({ count, onFit }: { count: number; onFit: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 10px", borderBottom: `1px solid ${theme.color.borderSubtle}` }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: theme.color.textPrimary }}>{count} {count === 1 ? "place" : "places"} shown</span>
      <button type="button" onClick={onFit} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: theme.font.ui, fontSize: 11.5, fontWeight: 600, color: theme.color.textMuted }}>Fit map to results</button>
    </div>
  );
}
