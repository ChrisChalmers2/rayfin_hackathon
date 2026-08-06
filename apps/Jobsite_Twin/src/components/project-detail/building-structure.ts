//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * Pure geometry math for the building's exposed structure (corner columns +
 * roof cap). Kept free of Three.js / React so it can be unit-tested and reused.
 */

/** Corner column thickness (x and z) in scene units. */
export const COLUMN_WIDTH = 0.3;

/** Roof cap thickness (y) in scene units. */
export const ROOF_HEIGHT = 0.2;

/**
 * Ground-to-roof height of a corner column for a stack of `levelCount` slabs at
 * the given `spacing`. Columns rise from the ground plane (y = 0) to the top of
 * the roof cap, so they always connect ground -> roof as the stack explodes.
 */
export function columnHeight(
    levelCount: number,
    spacing: number,
    baseY: number,
    slabHeight: number,
    roofHeight: number,
): number {
    const topSlabCenter = baseY + Math.max(levelCount - 1, 0) * spacing;
    return topSlabCenter + slabHeight / 2 + roofHeight;
}

/** The four corner [x, z] positions for a building footprint of width x depth. */
export function columnPositions(width: number, depth: number): [number, number][] {
    const hx = width / 2;
    const hz = depth / 2;
    return [
        [-hx, -hz],
        [hx, -hz],
        [-hx, hz],
        [hx, hz],
    ];
}
