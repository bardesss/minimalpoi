import { closestCenter, pointerWithin, type CollisionDetection } from "@dnd-kit/core";

/**
 * Pointer-first collision detection for the itinerary sortable list.
 *
 * The list interleaves non-droppable day headers and leg rows between the
 * draggable node rows. `closestCenter` measures from the dragged row's rect
 * centre, which drifts downward as dnd-kit reflows the displaced sibling out of
 * the way. Across a day-header gap that drift lets a small upward nudge flip the
 * drop target to the *previous day's* last node, so moving a stop to the top of
 * its day snapped it into the day before. Preferring the rect under the pointer
 * keeps the target on the row the user is actually over; `closestCenter` stays
 * as the fallback for keyboard drags, where there is no pointer.
 */
export const sortableCollision: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : closestCenter(args);
};
