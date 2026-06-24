import type { Category } from "../types/api";

export type ColorSpec = string | unknown[];

export function categoryColorExpression(categories: Category[]): ColorSpec {
  if (categories.length === 0) return "#888888";
  const expr: unknown[] = ["match", ["get", "category_id"]];
  for (const c of categories) {
    expr.push(c.id, c.color);
  }
  expr.push("#888888");
  return expr;
}
