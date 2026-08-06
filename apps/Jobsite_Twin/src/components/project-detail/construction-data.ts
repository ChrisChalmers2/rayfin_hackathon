//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * Pure mapping from live project data (zones + tasks) to per-floor
 * "construction" state for the construction-twin view. Kept free of Three.js /
 * React so it can be unit-tested and reused by any renderer.
 *
 * - Floor order comes from {@link computeZoneStackOrder} (Basement lowest, etc.).
 * - `buildFraction` = share of the zone's tasks that are Complete (0..1) — this
 *   drives how "finished" a floor renders (a partially-complete floor shows
 *   partly-built).
 * - `hasElectrical` / `hasPlumbing` come from the presence of Electrical /
 *   Plumbing tasks in that zone, so the MEP layers only appear where those
 *   systems actually exist.
 */

import type { Zone, ProjectTask } from "./types";
import { computeZoneStackOrder } from "./floor-stack";
import { worstZoneStatus } from "./task-status";

/** Per-floor construction state derived from live data. */
export interface ConstructionFloorData {
    locationId: string;
    zoneName: string;
    /** 0-based stack level from the bottom. */
    level: number;
    /** Worst-status-wins for the zone, or `null` when it has no tasks. */
    status: string | null;
    /** Fraction of the zone's tasks that are Complete, clamped to [0, 1]. */
    buildFraction: number;
    /** True when the zone has at least one electrical task. */
    hasElectrical: boolean;
    /** True when the zone has at least one plumbing task. */
    hasPlumbing: boolean;
}

const ELECTRICAL_RE = /electric/i;
const PLUMBING_RE = /plumb/i;

/** Clamp a number to [0, 1], treating non-finite / negative as 0. */
function clamp01(n: number): number {
    if (!Number.isFinite(n) || n <= 0) return 0;
    return n >= 1 ? 1 : n;
}

/**
 * Build ordered per-floor construction state from a project's zones and tasks.
 */
export function buildConstructionFloors(
    zones: readonly Zone[],
    tasks: readonly ProjectTask[],
): ConstructionFloorData[] {
    // Which locations have electrical / plumbing tasks.
    const electrical = new Set<string>();
    const plumbing = new Set<string>();
    for (const task of tasks) {
        if (!task.locationId) continue;
        if (ELECTRICAL_RE.test(task.taskName)) electrical.add(task.locationId);
        if (PLUMBING_RE.test(task.taskName)) plumbing.add(task.locationId);
    }

    return computeZoneStackOrder(zones).map(({ zone, level }) => ({
        locationId: zone.locationId,
        zoneName: zone.zoneName,
        level,
        status: worstZoneStatus({
            delayed: zone.delayed,
            atRisk: zone.atRisk,
            onTrack: zone.onTrack,
            complete: zone.complete,
        }),
        buildFraction: zone.totalTasks > 0 ? clamp01(zone.complete / zone.totalTasks) : 0,
        hasElectrical: electrical.has(zone.locationId),
        hasPlumbing: plumbing.has(zone.locationId),
    }));
}
