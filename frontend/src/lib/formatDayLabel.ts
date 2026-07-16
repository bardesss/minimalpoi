const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "2026-07-16" -> "THU 16 JUL". Built from the date parts (not `new Date(iso)`)
 * so a UTC-midnight parse can't shift the label to the previous day. */
export function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${weekday} ${d} ${MONTHS[m - 1]}`;
}
