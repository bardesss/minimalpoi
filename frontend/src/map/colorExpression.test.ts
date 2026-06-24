import { describe, expect, it } from "vitest";
import type { Category } from "../types/api";
import { categoryColorExpression } from "./colorExpression";

const cat = (id: number, color: string): Category => ({ id, name: "c", color, icon: null, created_by: 1, trip_category_id: null, trip_sync_status: "s" });

describe("categoryColorExpression", () => {
  it("returns a constant when there are no categories", () => {
    expect(categoryColorExpression([])).toBe("#888888");
  });
  it("builds a match expression keyed on category_id", () => {
    expect(categoryColorExpression([cat(1, "#E1574C"), cat(2, "#2F9E63")])).toEqual([
      "match", ["get", "category_id"], 1, "#E1574C", 2, "#2F9E63", "#888888",
    ]);
  });
});
