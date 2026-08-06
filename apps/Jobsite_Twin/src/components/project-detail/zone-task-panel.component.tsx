//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { MousePointerClick } from "lucide-react";
import { StatusPill } from "./status-pill.component";
import type { ProjectTask, Zone } from "./types";

interface ZoneTaskPanelProps {
    zone: Zone | null;
    tasks: ProjectTask[];
}

/** Side panel listing the tasks in the currently selected 3D zone. */
export function ZoneTaskPanel({ zone, tasks }: ZoneTaskPanelProps) {
    if (!zone) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-s p-l text-center">
                <MousePointerClick className="icon-size-400 text-muted-foreground" aria-hidden />
                <p className="font-base text-200 leading-300 text-muted-foreground m-0">
                    Click a zone in the model to see its tasks.
                </p>
            </div>
        );
    }

    const zoneTasks = tasks.filter((t) => t.locationId === zone.locationId);

    return (
        <div className="flex h-full flex-col">
            <div className="border-b border-border px-l py-m">
                <h3 className="font-heading font-semibold uppercase tracking-wide text-300 leading-300 text-foreground m-0">
                    {zone.zoneName}
                </h3>
                <p className="font-base text-200 leading-200 text-muted-foreground m-0 mt-xxs">
                    {zoneTasks.length} {zoneTasks.length === 1 ? "task" : "tasks"}
                </p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-s">
                {zoneTasks.length === 0 ? (
                    <p className="p-m font-base text-200 leading-200 text-muted-foreground m-0">
                        No tasks recorded for this zone.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-xs m-0 p-0 list-none">
                        {zoneTasks.map((t) => (
                            <li
                                key={t.taskId}
                                className="flex items-center justify-between gap-s rounded-lg border border-border bg-card px-m py-s"
                            >
                                <span className="font-base text-200 leading-200 text-foreground truncate">
                                    {t.taskName}
                                </span>
                                <StatusPill status={t.taskStatus} className="shrink-0" />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
