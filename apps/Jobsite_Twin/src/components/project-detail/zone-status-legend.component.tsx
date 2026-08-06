//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { TASK_STATUS_COLORS, NO_TASKS_COLOR } from "./task-status";

/** Legend rows, in worst-status-wins severity order, plus the no-tasks state. */
const LEGEND_ITEMS: { label: string; color: string }[] = [
    { label: "Delayed", color: TASK_STATUS_COLORS.Delayed },
    { label: "At Risk", color: TASK_STATUS_COLORS["At Risk"] },
    { label: "On Track", color: TASK_STATUS_COLORS["On Track"] },
    { label: "Complete", color: TASK_STATUS_COLORS.Complete },
    { label: "No tasks", color: NO_TASKS_COLOR },
];

/**
 * Compact legend card explaining the floor-slab status colors (Phase 5).
 * Reuses `TASK_STATUS_COLORS` / `NO_TASKS_COLOR` directly so the legend can
 * never drift from the actual slab material colors. Uses theme tokens (not
 * hard-coded light/dark colors) for its own chrome so it stays readable in
 * both themes. Unpositioned — the parent scene places it in its overlay
 * layout (top-left, above/near the status filter) to avoid conflicting with
 * the explode/reset controls, hover tooltip, or help/instructions.
 */
export function ZoneStatusLegend() {
    return (
        <div
            role="region"
            aria-label="Floor status legend"
            className="pointer-events-none max-w-[200px] rounded-lg border border-border bg-card/90 px-s py-xs shadow-sm backdrop-blur"
        >
            <span className="font-heading font-semibold uppercase tracking-wide text-100 leading-200 text-foreground">
                Status
            </span>
            <div className="mt-xxs flex flex-col gap-xxs">
                {LEGEND_ITEMS.map((item) => (
                    <div key={item.label} className="flex items-center gap-xs">
                        <span
                            aria-hidden
                            className="inline-block h-xs w-xs rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-100 leading-200 text-foreground">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
