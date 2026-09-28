import { routeDayColors } from "../theme";

/**
 * Cycled-by-day colour expression, shared by RouteMap's line/point/label paint
 * properties. Wrapped in "to-color" so MapLibre's style validator accepts it —
 * "at"/"literal" alone type as array<string>, which fails color-typed paint
 * properties even though every entry is a valid color string.
 */
export const DAY_COLOR_EXPRESSION = [
  "to-color",
  ["at", ["%", ["get", "day"], routeDayColors.length], ["literal", [...routeDayColors]]],
] as const;
