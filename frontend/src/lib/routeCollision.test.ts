import { describe, expect, it } from "vitest";
import { closestCenter } from "@dnd-kit/core";
import { sortableCollision } from "./routeCollision";

/** Minimal ClientRect for a 100px-wide row at a given vertical band. */
function rect(top: number, height = 40) {
  return { top, left: 0, right: 100, bottom: top + height, width: 100, height };
}

// Two rows: PREV (the previous day's last node, static at the top) and CUR (the
// current day's first node, reflowed downward to open a slot for the drag). The
// dragged row's centre has drifted up next to PREV, but the pointer is still
// hovering over CUR's visible row.
const PREV = "prev-day-node";
const CUR = "current-day-node";

function args(pointer: { x: number; y: number } | null) {
  const droppableRects = new Map([
    [PREV, rect(0)], // centre y = 20
    [CUR, rect(100)], // reflowed down; centre y = 120
  ]);
  const droppableContainers = [{ id: PREV }, { id: CUR }] as never;
  return {
    active: { id: "dragged" } as never,
    collisionRect: rect(0), // dragged centre drifted up to y = 20 (nearest PREV)
    droppableRects: droppableRects as never,
    droppableContainers,
    pointerCoordinates: pointer,
  };
}

describe("sortableCollision", () => {
  it("picks the row under the pointer, not the drifted-centre neighbour", () => {
    // closestCenter is fooled by the drifted centre and picks the previous day.
    expect(closestCenter(args({ x: 50, y: 120 }))[0].id).toBe(PREV);
    // Pointer-first keeps the drop on the row the user is hovering (current day).
    expect(sortableCollision(args({ x: 50, y: 120 }))[0].id).toBe(CUR);
  });

  it("falls back to closestCenter when there is no pointer (keyboard drag)", () => {
    expect(sortableCollision(args(null))[0].id).toBe(PREV);
  });
});
