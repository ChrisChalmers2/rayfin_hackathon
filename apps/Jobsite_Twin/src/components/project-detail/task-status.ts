//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * Color map for task-level delivery status. Extends the portfolio's
 * three project statuses with a distinct "Complete" (finished) color so
 * completed work reads differently from in-flight "On Track" work.
 * Kept consistent across the 3D zone scene, the zone task panel, and the
 * project task grid.
 */
export const TASK_STATUS_COLORS: Record<string, string> = {
    Delayed: "#c62828",
    "At Risk": "#d97706",
    "On Track": "#2e7d32",
    Complete: "#3b6ea5",
};

/** Neutral color for a zone with no tasks. */
export const NO_TASKS_COLOR = "#9a9691";

/** Per-status task counts for a single zone. */
export interface ZoneStatusCounts {
    delayed: number;
    atRisk: number;
    onTrack: number;
    complete: number;
}

/**
 * Worst-status-wins aggregation: a zone takes the color of its most
 * severe task status (Delayed > At Risk > On Track > Complete). Returns
 * `null` when the zone has no tasks.
 */
export function worstZoneStatus(counts: ZoneStatusCounts): string | null {
    if (counts.delayed > 0) return "Delayed";
    if (counts.atRisk > 0) return "At Risk";
    if (counts.onTrack > 0) return "On Track";
    if (counts.complete > 0) return "Complete";
    return null;
}

/** Resolves the display color for a zone from its status counts. */
export function zoneColor(counts: ZoneStatusCounts): string {
    const status = worstZoneStatus(counts);
    return status ? TASK_STATUS_COLORS[status] : NO_TASKS_COLOR;
}
