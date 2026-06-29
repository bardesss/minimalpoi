import { useEffect, useState } from "react";
import {
  type CountryCode,
  getCountryCallingCode,
  parsePhoneNumber,
} from "libphonenumber-js";
import CountrySelect from "./CountrySelect";
import { inputStyle, theme } from "../theme";

const DEFAULT_COUNTRY: CountryCode = "NL";

function parseInitial(value: string): { country: CountryCode; national: string } {
  if (value) {
    try {
      const p = parsePhoneNumber(value);
      if (p?.country) return { country: p.country, national: p.nationalNumber };
    } catch {
      // fall through to defaults
    }
  }
  // Unparseable / national-only: keep the raw digits, default the region.
  return { country: DEFAULT_COUNTRY, national: value.startsWith("+") ? "" : value };
}

/**
 * Worldwide phone entry: a country picker + national-number input that emits a
 * normalized E.164 string (e.g. "+31203080090") to `onChange`. When the number
 * isn't yet valid it emits the best-effort "+<cc><digits>" so nothing is lost;
 * the backend normalizer is the final, lenient authority.
 */
export default function PhoneInput({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const init = parseInitial(value);
  const [country, setCountry] = useState<CountryCode>(init.country);
  const [national, setNational] = useState(init.national);
  const [invalid, setInvalid] = useState(false);

  // Sync when the value changes externally (e.g. enrichment fills the field).
  useEffect(() => {
    const next = parseInitial(value);
    setCountry(next.country);
    setNational(next.national);
    setInvalid(false);
  }, [value]);

  function emit(nextCountry: CountryCode, rawNational: string) {
    const digits = rawNational.replace(/[^\d]/g, "");
    if (!digits) {
      setInvalid(false);
      if (value !== "") onChange("");
      return;
    }
    const full = `+${getCountryCallingCode(nextCountry)}${digits}`;
    try {
      const p = parsePhoneNumber(full);
      if (p && p.isValid()) {
        setInvalid(false);
        onChange(p.number);
        return;
      }
    } catch {
      // not valid yet
    }
    setInvalid(true);
    onChange(full);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <CountrySelect
          value={country}
          onChange={(c) => {
            setCountry(c);
            emit(c, national);
          }}
        />
        <input
          id={id}
          type="tel"
          inputMode="tel"
          placeholder="20 308 0090"
          value={national}
          onChange={(e) => setNational(e.target.value)}
          onBlur={() => emit(country, national)}
          style={{ ...inputStyle, flex: 1, borderColor: invalid ? theme.color.dangerText : undefined }}
        />
      </div>
      {invalid && (
        <p style={{ margin: "4px 0 0", fontSize: 11.5, color: theme.color.dangerText }}>
          Not a valid number yet — it’ll be saved as entered.
        </p>
      )}
    </div>
  );
}
