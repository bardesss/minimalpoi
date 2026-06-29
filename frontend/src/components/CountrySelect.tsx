import { useEffect, useRef, useState } from "react";
import { type CountryCode, getCountries, getCountryCallingCode } from "libphonenumber-js";
import Flag from "./Flag";
import { inputStyle, theme } from "../theme";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

// All ~245 regions libphonenumber knows about, with a localized display name.
export const COUNTRIES = getCountries()
  .map((code) => ({ code, calling: getCountryCallingCode(code), name: regionNames.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Compact country picker: the trigger shows just the flag + dial code (a full
 * country name is too wide), and the dropdown is a searchable, flag-prefixed
 * list. A native <select> can't render the flag SVG in its collapsed state, so
 * this is a small custom listbox instead.
 */
export default function CountrySelect({
  value,
  onChange,
}: {
  value: CountryCode;
  onChange: (code: CountryCode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const current = COUNTRIES.find((c) => c.code === value);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const digits = q.replace(/^\+/, "");
  const filtered = q
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.calling.includes(digits))
    : COUNTRIES;

  function select(code: CountryCode) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={`Country: ${current?.name ?? value}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          ...inputStyle,
          width: "auto",
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <Flag code={value} />
        <span>+{current?.calling}</span>
        <span aria-hidden style={{ marginLeft: 2, color: theme.color.textInputIcon }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Country"
          style={{
            position: "absolute",
            zIndex: 40,
            top: "calc(100% + 4px)",
            left: 0,
            width: 280,
            maxWidth: "calc(100vw - 32px)",  // never overflow a narrow phone screen
            maxHeight: "min(50vh, 320px)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            background: theme.color.surface0,
            border: `1px solid ${theme.color.borderStd}`,
            borderRadius: theme.radius.card,
            boxShadow: theme.shadow.expand,
            padding: 6,
          }}
        >
          <input
            autoFocus
            aria-label="Search country"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ ...inputStyle, marginBottom: 6 }}
          />
          {filtered.map((c) => {
            const selected = c.code === value;
            return (
              <button
                key={c.code}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={`${c.name} (+${c.calling})`}
                onClick={() => select(c.code)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 8px",  // comfortable touch target on mobile
                  border: "none",
                  borderRadius: theme.radius.tag,
                  cursor: "pointer",
                  background: selected ? theme.color.tintBg : "transparent",
                  color: theme.color.textBody,
                  fontFamily: theme.font.ui,
                  fontSize: 13,
                  textAlign: "left",
                }}
              >
                <Flag code={c.code} />
                <span style={{ flex: 1 }}>{c.name}</span>
                <span style={{ color: theme.color.textSecondary }}>+{c.calling}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 8, fontSize: 12.5, color: theme.color.textSecondary }}>No match</div>
          )}
        </div>
      )}
    </div>
  );
}
