//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { cn } from "@/lib/utils";
import { TASK_STATUS_COLORS } from "./task-status";

interface StatusPillProps {
    status: string;
    className?: string;
}

/** Colored dot + label pill for a task or project delivery status. */
export function StatusPill({ status, className }: StatusPillProps) {
    const color = TASK_STATUS_COLORS[status] ?? "var(--color-muted-foreground)";
    return (
        <span
            className={cn(
                "inline-flex items-center gap-xs rounded-full border border-border bg-card px-s py-xxs font-base text-200 leading-200 text-foreground",
                className,
            )}
        >
            <span aria-hidden className="inline-block h-s w-s rounded-full" style={{ backgroundColor: color }} />
            {status}
        </span>
    );
}
