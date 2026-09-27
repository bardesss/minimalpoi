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

/** `tel:` link for a stored phone number: a leading "+" (if any) plus digits
 * only, so nothing but a dialable number can reach the href. Null when there
 * aren't enough digits to dial. */
export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 3) return null;
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}
