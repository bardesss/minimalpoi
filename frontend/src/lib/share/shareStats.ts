import type { RouteDetail } from "../../types/api";
import { daysBetween } from "../routeDays";

export interface ShareStats {
  distance: string;
  days: string;
  stops: string;
}

export function shareStats(route: RouteDetail): ShareStats {
  const km = Math.round(route.total_distance_m / 1000);
  const end = route.end_date ?? route.scheduled_end_date;
  const dayCount = daysBetween(route.start_date, end) + 1; // inclusive
  const stopCount = route.nodes.filter((n) => n.role == null).length;
  return {
    distance: `${km} km`,
    days: `${dayCount} ${dayCount === 1 ? "day" : "days"}`,
    stops: `${stopCount} ${stopCount === 1 ? "stop" : "stops"}`,
  };
}
