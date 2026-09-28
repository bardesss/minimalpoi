import { defaultLocale } from "./formatDate";

/** "2026-07-16" -> "THU 16 JUL" (locale-aware). Built from the date parts (not
 * `new Date(iso)`) so a UTC-midnight parse can't shift the label to the
 * previous day. Defaults to the user's language (`navigator.language`). */
export function formatDayLabel(iso: string, locale: string | undefined = defaultLocale()): string {
  const [y, m, d] = iso.split("-").map(Number);
  const parts = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatToParts(new Date(Date.UTC(y, m - 1, d)));

  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const stripDot = (s: string) => s.replace(/\.$/, "");

  const label = [part("weekday"), part("day"), part("month")].map(stripDot).join(" ");
  return label.toLocaleUpperCase(locale);
}
