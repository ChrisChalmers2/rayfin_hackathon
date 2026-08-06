//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { X } from "lucide-react";
import type { ProjectStatus } from "@/hooks/use-status-filter";
import { STATUS_COLORS } from "./status-colors";

interface StatusFilterChipProps {
    /** The active status filter, or `null` when the portfolio is unfiltered. */
    status: ProjectStatus | null;
    /** Clears the active filter. */
    onClear: () => void;
}

/**
 * Filter indicator shown above the KPI row when a portfolio status
 * cross-filter is active. Renders nothing when the portfolio is unfiltered.
 */
export function StatusFilterChip({ status, onClear }: StatusFilterChipProps) {
    if (!status) return null;
    const color = STATUS_COLORS[status] ?? "var(--color-muted-foreground)";

    return (
        <div className="flex items-center gap-s" aria-live="polite">
            <span className="font-heading font-semibold uppercase tracking-wide text-100 leading-200 text-muted-foreground">
                Filtered by
            </span>
            <span className="inline-flex items-center gap-s rounded-full border border-border bg-card py-xxs pl-s pr-xxs">
                <span aria-hidden className="inline-block h-s w-s rounded-full" style={{ backgroundColor: color }} />
                <span className="font-base font-medium text-200 leading-200 text-foreground">{status}</span>
                <button
                    type="button"
                    onClick={onClear}
                    aria-label={`Clear ${status} filter`}
                    className="flex h-xl w-xl items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <X className="icon-size-100" aria-hidden />
                </button>
            </span>
        </div>
    );
}
