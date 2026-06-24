// frontend/src/components/Legend.tsx
import type { Category } from "../types/api";
import { theme } from "../theme";

export default function Legend({ categories, counts }: { categories: Category[]; counts: Record<number, number> }) {
  if (categories.length === 0) return null;
  return (
    <div style={{ position: "absolute", left: 16, bottom: 16, zIndex: 600, maxWidth: 200, background: "rgba(255,255,255,.94)", backdropFilter: "blur(6px)", border: `1px solid ${theme.color.borderCard}`, borderRadius: theme.radius.card, padding: "12px 14px", boxShadow: theme.shadow.legend }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, marginBottom: 8 }}>Categories</div>
      {categories.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.color }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.color.textBody }}>{c.name}</span>
          <span style={{ marginLeft: "auto", fontFamily: theme.font.mono, fontSize: 11, color: theme.color.textInputIcon }}>{counts[c.id] ?? 0}</span>
        </div>
      ))}
    </div>
  );
}
