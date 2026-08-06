//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useCallback } from "react";
import { useHashSearchParams } from "@/lib/hash-router";

/** The delivery statuses that can drive the portfolio cross-filter. */
export const PROJECT_STATUSES = ["On Track", "At Risk", "Delayed"] as const;

/** A single valid project delivery status. */
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Query-string key that persists the active status filter on the `/` route. */
export const STATUS_PARAM = "status";

/**
 * Validates a raw query-string value against the known project statuses.
 * Returns the matching {@link ProjectStatus}, or `null` for anything else
 * (missing, empty, or unrecognized) so callers never act on junk input.
 */
export function parseStatusParam(raw: string | null | undefined): ProjectStatus | null {
    if (!raw) return null;
    return (PROJECT_STATUSES as readonly string[]).includes(raw) ? (raw as ProjectStatus) : null;
}

interface UseStatusFilterResult {
    /** The active status filter, or `null` when the portfolio is unfiltered. */
    status: ProjectStatus | null;
    /** Sets the filter to a specific status, or clears it when passed `null`. */
    setStatus: (next: ProjectStatus | null) => void;
    /** Sets the filter to `next`, or clears it when `next` is already active. */
    toggleStatus: (next: ProjectStatus) => void;
    /** Clears the active filter. */
    clearStatus: () => void;
}

/**
 * Reads and writes the portfolio status cross-filter from the URL query
 * string (`?status=`). Keeping the filter in the URL makes it shareable,
 * survives reloads, and restores automatically when the user returns from
 * the project detail page via the browser Back button.
 */
export function useStatusFilter(): UseStatusFilterResult {
    const [searchParams, setSearchParams] = useHashSearchParams();
    const status = parseStatusParam(searchParams.get(STATUS_PARAM));

    const setStatus = useCallback(
        (next: ProjectStatus | null) => {
            const params = new URLSearchParams(searchParams);
            if (next) params.set(STATUS_PARAM, next);
            else params.delete(STATUS_PARAM);
            setSearchParams(params);
        },
        [searchParams, setSearchParams],
    );

    const toggleStatus = useCallback(
        (next: ProjectStatus) => {
            setStatus(status === next ? null : next);
        },
        [status, setStatus],
    );

    const clearStatus = useCallback(() => setStatus(null), [setStatus]);

    return { status, setStatus, toggleStatus, clearStatus };
}
