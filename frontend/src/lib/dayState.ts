import type { RouteDetail } from "../types/api";
import { groupNodesByDay } from "./routeDays";

/** Today's local calendar date as ISO "YYYY-MM-DD" — local (not UTC) so it
 * lines up with the day labels the user sees. */
export function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** A day is passed when its date is strictly before today. ISO date strings
 * sort lexicographically, so plain `<` is correct. */
export function isDayPassed(dayKey: string, today: string): boolean {
  return dayKey < today;
}

/** Ids of every node whose day group is passed — used to de-emphasise them on
 * the map. */
export function passedNodeIds(route: RouteDetail, today: string): Set<number> {
  const ids = new Set<number>();
  for (const group of groupNodesByDay(route)) {
    if (isDayPassed(group.dayKey, today)) for (const n of group.nodes) ids.add(n.id);
  }
  return ids;
}
