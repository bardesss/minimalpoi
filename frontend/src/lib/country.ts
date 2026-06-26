// Country helpers — resolve a country name to an ISO 3166-1 alpha-2 code and
// derive a display city/country from a single formatted address string.
//
// These are the *fallback* path: freshly enriched POIs carry a precise
// `city` + `country_code` from Google's structured address_components. For
// older POIs (only a formatted `address` string) we parse here, which is
// approximate — address shapes vary by country.
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import nl from "i18n-iso-countries/langs/nl.json";
import de from "i18n-iso-countries/langs/de.json";
import fr from "i18n-iso-countries/langs/fr.json";

countries.registerLocale(en);
countries.registerLocale(nl);
countries.registerLocale(de);
countries.registerLocale(fr);

const LOOKUP_LANGS = ["en", "nl", "de", "fr"];

/** Resolve a country name (any of the registered languages) to its alpha-2 code. */
export function countryCodeFromName(name: string | null | undefined): string | null {
  const value = name?.trim();
  if (!value) return null;
  for (const lang of LOOKUP_LANGS) {
    const code = countries.getAlpha2Code(value, lang);
    if (code) return code;
  }
  return null;
}

function addressParts(address: string | null): string[] {
  if (!address) return [];
  return address.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Country code parsed from the tail of a formatted address, or null. */
export function countryCodeFromAddress(address: string | null): string | null {
  const parts = addressParts(address);
  if (!parts.length) return null;
  return countryCodeFromName(parts[parts.length - 1]);
}

/**
 * Display city parsed from a formatted address.
 *
 * If the last segment is a recognized country, the city is the segment before
 * it; otherwise the last segment is treated as the city. A leading postal-code
 * fragment is stripped (e.g. "1059 CV Amsterdam" → "Amsterdam").
 */
export function cityFromAddress(address: string | null): string {
  const parts = addressParts(address);
  if (!parts.length) return "";
  const lastIsCountry = countryCodeFromName(parts[parts.length - 1]) != null;
  const idx = lastIsCountry && parts.length >= 2 ? parts.length - 2 : parts.length - 1;
  const tokens = parts[idx].split(/\s+/);
  while (tokens.length > 1 && /^[0-9][0-9A-Za-z-]*$|^[A-Z]{1,3}$/.test(tokens[0])) tokens.shift();
  return tokens.join(" ");
}
