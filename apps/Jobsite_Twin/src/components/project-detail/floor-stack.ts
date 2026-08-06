//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * Pure floor-stacking logic for the 3D building. Parses a zone's `zone_name`
 * into a vertical sort key, then orders zones bottom -> top and assigns each a
 * 0-based stack level. Kept free of Three.js / React so it can be unit-tested
 * in isolation and reused by any renderer.
 */

/** Result of classifying a single zone name for vertical ordering. */
export interface ZoneSortResult {
    /** True when the name matched a recognized zone label (Basement / Exterior / Floor N / Roof). */
    known: boolean;
    /** Numeric key ordering slabs bottom (low) -> top (high). */
    sortKey: number;
}

/** Slab dimensions in scene units: [width(x), height(y), depth(z)]. */
export const SLAB_SIZE: [number, number, number] = [8, 0.5, 6];

/**
 * Fallback sort key for zone names we do not recognize (e.g. "Mechanical Room").
 * Chosen to sit ABOVE any realistic numbered floor count but BELOW the Roof
 * (sortKey 100), so unknown zones stack near the top yet never above the roof.
 * Bump this if a building can legitimately exceed ~50 numbered floors.
 */
export const UNKNOWN_SORT_KEY = 50;

/** A zone decorated with its resolved sort key and final stack level. */
export interface StackedZone<T> {
    zone: T;
    sortKey: number;
    /** 0-based level from the bottom of the stack (0 = lowest slab). */
    level: number;
}

const FLOOR_RE = /^floor\s+(-?\d+)$/i;

/**
 * Classifies a zone name for vertical ordering.
 *
 * Recognized patterns (assigned an explicit sortKey):
 *   - "Basement"  -> sortKey -1    (below floor 1)
 *   - "Exterior"  -> sortKey -0.5  (grade level: above Basement, below Floor 1)
 *   - "Floor N"   -> sortKey N     (case- and whitespace-insensitive)
 *   - "Roof"      -> sortKey 100   (top of stack, above all floors)
 *
 * Anything else is reported as `known: false` and falls back to
 * {@link UNKNOWN_SORT_KEY} (50) — above realistic floors, below the Roof.
 * "Mechanical Room" is intentionally left unrecognized because its real-world
 * placement varies (basement plant vs. rooftop penthouse).
 *
 * Extension pattern — add cases before the unknown fallback below:
 *   - "Sub-Basement"        -> sortKey -2   (below the Basement)
 *   - "Lobby"               -> sortKey 0.5  (wedge between Exterior and Floor 1)
 *   - "Mezzanine 1"         -> sortKey 1.5  (decimal wedges between whole floors)
 *   - "Rooftop" / "Penthouse" -> just under 100 (e.g. 99) to sit below the Roof
 */
export function parseZoneSortKey(zoneName: string): ZoneSortResult {
    const name = zoneName.trim();
    if (/^basement$/i.test(name)) return { known: true, sortKey: -1 };
    if (/^exterior$/i.test(name)) return { known: true, sortKey: -0.5 };
    if (/^roof$/i.test(name)) return { known: true, sortKey: 100 };
    const match = FLOOR_RE.exec(name);
    if (match) return { known: true, sortKey: Number(match[1]) };
    // Unknown name — sits above realistic floors but below the Roof.
    return { known: false, sortKey: UNKNOWN_SORT_KEY };
}

/**
 * Orders zones bottom -> top and assigns contiguous 0-based stack levels.
 *
 * Ordering is purely by `sortKey` ascending. Recognized zones get distinct keys
 * (Basement -1, Exterior -0.5, Floor N, Roof 100); unknown zones share
 * {@link UNKNOWN_SORT_KEY} (50) so they cluster just below the Roof. Ties (only
 * possible among unknowns) break alphabetically, then by original input order.
 */
export function computeZoneStackOrder<T extends { zoneName: string }>(
    zones: readonly T[],
): StackedZone<T>[] {
    const decorated = zones.map((zone, index) => ({ zone, index, ...parseZoneSortKey(zone.zoneName) }));

    decorated.sort((a, b) => {
        // Primary: ascending vertical sort key.
        if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
        // Equal keys (unknown zones): alphabetical, then stable by input order.
        const byName = a.zone.zoneName.localeCompare(b.zone.zoneName);
        return byName !== 0 ? byName : a.index - b.index;
    });

    return decorated.map((d, level) => ({ zone: d.zone, sortKey: d.sortKey, level }));
}
