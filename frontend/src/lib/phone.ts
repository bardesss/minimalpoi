import { parsePhoneNumber } from "libphonenumber-js";

/**
 * Pretty international form for display (e.g. "+31 20 308 0090").
 * Falls back to the raw stored value when it can't be parsed — the backend
 * keeps unparseable numbers verbatim, so we must render them as-is.
 */
export function formatPhoneDisplay(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const parsed = parsePhoneNumber(value);
    if (parsed) return parsed.formatInternational();
  } catch {
    // not a parseable number — show what we have
  }
  return value;
}
