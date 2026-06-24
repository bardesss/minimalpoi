import { Search } from "lucide-react";
import { theme } from "../../theme";

export default function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: "relative", padding: "14px 20px 4px" }}>
      <Search size={14} color={theme.color.textInputIcon} style={{ position: "absolute", left: 32, top: 24 }} aria-hidden />
      <input
        aria-label="Search places or addresses"
        placeholder="Search places or addresses"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 12px 10px 32px", borderRadius: theme.radius.input, border: `1px solid ${theme.color.borderStd}`, background: theme.color.pageBg, fontFamily: theme.font.ui, fontSize: 13.5, color: theme.color.textPrimary, outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}
