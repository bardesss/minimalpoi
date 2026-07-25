import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { theme } from "../../theme";

export default function SearchBox({ value, onChange, trailing }: { value: string; onChange: (v: string) => void; trailing?: ReactNode }) {
  return (
    <div style={{ padding: "14px 20px 4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <Search size={14} color={theme.color.textInputIcon} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} aria-hidden />
          <input
            id="poi-search"
            aria-label="Search places, cities, countries or tags"
            placeholder="Search places, cities, countries or tags"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: "100%", padding: "10px 12px 10px 32px", borderRadius: theme.radius.input, border: `1px solid ${theme.color.borderStd}`, background: theme.color.pageBg, fontFamily: theme.font.ui, fontSize: 13.5, color: theme.color.textPrimary, boxSizing: "border-box" }}
          />
        </div>
        {trailing}
      </div>
    </div>
  );
}
