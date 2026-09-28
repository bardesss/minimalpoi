// Human, locale-aware dates for routes ("Fri 9 – Sun 11 Oct 2026").
// Dates arrive as "YYYY-MM-DD"; they're built from their parts (not
// `new Date(iso)`) so a UTC-midnight parse can't shift them a day.

const OPTIONS: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", year: "numeric" };

function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function defaultLocale(): string | undefined {
  return typeof navigator === "undefined" ? undefined : navigator.language;
}

/** A formatter for `locale`, falling back to the runtime default when the tag
 * is malformed (Intl throws RangeError) so a bad navigator/locale value can't
 * crash the page. */
function formatter(locale: string | undefined): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale, OPTIONS);
  } catch (e) {
    if (e instanceof RangeError) return new Intl.DateTimeFormat(undefined, OPTIONS);
    throw e;
  }
}

export function formatDate(iso: string, locale: string | undefined = defaultLocale()): string {
  return formatter(locale).format(toDate(iso));
}

/** A date range with shared month/year collapsed the way the locale does it
 * (Intl formatRange). Open-ended → "From …"; same day → a single date. */
export function formatDateRange(start: string, end: string | null | undefined, locale: string | undefined = defaultLocale()): string {
  if (!end) return `From ${formatDate(start, locale)}`;
  if (end === start) return formatDate(start, locale);
  return formatter(locale).formatRange(toDate(start), toDate(end));
}
