/**
 * Fractional positioning for board/list/card ordering.
 * New items get `last + GAP`; moves get the midpoint of their neighbours,
 * so a reorder updates exactly one row. When midpoints collapse below
 * MIN_GAP the caller should rebalance the affected container.
 */

export const POSITION_GAP = 65536;
export const MIN_POSITION_GAP = 1e-6;

/** Position for appending after the current maximum (or the first item). */
export function appendPosition(maxPosition: number | null | undefined): number {
  return (maxPosition ?? 0) + POSITION_GAP;
}

/** Midpoint between two neighbours; either side may be absent. */
export function betweenPosition(
  before: number | null | undefined,
  after: number | null | undefined,
): number {
  if (before == null && after == null) return POSITION_GAP;
  if (before == null) return (after as number) / 2;
  if (after == null) return before + POSITION_GAP;
  return (before + after) / 2;
}

/** True when neighbours are too close and the container needs rebalancing. */
export function needsRebalance(
  before: number | null | undefined,
  after: number | null | undefined,
): boolean {
  if (before == null || after == null) return false;
  return Math.abs(after - before) < MIN_POSITION_GAP;
}

/** Evenly spaced positions for a full rebalance. */
export function rebalancedPositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * POSITION_GAP);
}
