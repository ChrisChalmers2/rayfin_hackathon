//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * Pure matching logic for the optional 3D-view status filter (Phase 6, see
 * docs/zoom-enhancement.md). The filter answers "where are the problems?" by
 * dimming floors in the 3D scene whose worst status doesn't match the
 * selected value; it is intentionally scoped to the 3D scene only and never
 * touches the task table (Q3) or hides floors (Q2 — dim, never hide).
 */

/** Selectable values for the 3D-view status filter. `"All"` is the default. */
export const STATUS_FILTER_OPTIONS = ["All", "Delayed", "At Risk", "On Track", "Complete", "No tasks"] as const;

/** A value from {@link STATUS_FILTER_OPTIONS}. */
export type StatusFilterValue = (typeof STATUS_FILTER_OPTIONS)[number];

/** The filter's default value: no dimming applied. */
export const DEFAULT_STATUS_FILTER: StatusFilterValue = "All";

/**
 * True when a zone's worst status matches the active filter. `"All"` matches
 * everything; `"No tasks"` matches zones with a `null` (no-task) status;
 * otherwise the filter matches on exact worst-status equality.
 */
export function zoneMatchesStatusFilter(status: string | null, filter: StatusFilterValue): boolean {
    if (filter === "All") return true;
    if (filter === "No tasks") return status === null;
    return status === filter;
}

/**
 * True when a zone should be DIMMED under the active filter — i.e. the
 * filter is active (not `"All"`) and the zone's status doesn't match it.
 * Never true for `"All"`, matching the "never hide, only dim" contract.
 */
export function isDimmedByStatusFilter(status: string | null, filter: StatusFilterValue): boolean {
    return filter !== "All" && !zoneMatchesStatusFilter(status, filter);
}
