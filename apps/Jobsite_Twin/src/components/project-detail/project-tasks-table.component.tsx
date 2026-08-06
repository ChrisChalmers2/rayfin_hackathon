//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { DataGrid, type GridColumnDef, type CellValue } from "@microsoft/fabric-datagrid";
import { useCssTheme } from "@microsoft/fabric-visuals";
import type { InteractionEvent } from "@microsoft/fabric-visuals-core";
import { projectDetailTasks } from "@/queries/project-detail";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { listAllForProject } from "@/lib/comments-client";
import { Panel, PanelSkeleton, PanelError, PanelEmpty } from "../portfolio/panel.component";
import { StatusPill } from "./status-pill.component";

/** Formats an ISO date string as e.g. "Nov 17, 2023"; blank stays a dash. */
function formatDate(value: CellValue): string {
    if (value == null || value === "") return "—";
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function baseColumns(
    onSelectTaskComments: (taskId: string, taskName: string) => void,
): GridColumnDef[] {
    return [
        { id: "TaskName", header: "Task", sortable: true },
        {
            id: "ZoneName",
            header: "Zone",
            sortable: true,
            filterable: true,
            cellRenderer: (value) => (
                <span className="font-heading font-semibold uppercase tracking-wide text-100 leading-200 text-foreground">
                    {String(value ?? "")}
                </span>
            ),
        },
        {
            id: "TaskStatus",
            header: "Status",
            sortable: true,
            cellRenderer: (value) => <StatusPill status={String(value ?? "")} />,
        },
        { id: "PlannedEndDate", header: "Planned End", sortable: true, cellRenderer: (v) => formatDate(v) },
        { id: "ActualEndDate", header: "Actual End", sortable: true, cellRenderer: (v) => formatDate(v) },
        {
            id: "DelayDays",
            header: "Delay (days)",
            sortable: true,
            numeric: true,
            cellRenderer: (v) => (v == null ? "—" : String(v)),
        },
        {
            id: "CommentCount",
            header: "Comments",
            sortable: true,
            numeric: true,
            cellRenderer: (value, row) => {
                const taskId = String(row.TaskId ?? "");
                const taskName = String(row.TaskName ?? "");
                const count = typeof value === "number" ? value : 0;
                return (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectTaskComments(taskId, taskName);
                        }}
                        aria-label={`View comments for ${taskName}`}
                        className="inline-flex items-center gap-xs rounded-lg border border-border bg-card px-s py-xxs font-base text-100 leading-200 text-foreground hover:bg-hover"
                    >
                        <MessageSquare className="icon-size-100" aria-hidden />
                        {count}
                    </button>
                );
            },
        },
    ];
}

/** DataGrid of every task in the project, with computed delay days. */
export function ProjectTasksTable({
    projectId,
    onSelectZoneName,
    onSelectTaskComments,
    commentsRefreshKey,
}: {
    projectId: string;
    /** Invoked with a clicked task's zone name; the parent resolves it to a
     * location id to drive 3D zone selection. */
    onSelectZoneName: (zoneName: string) => void;
    /** Invoked with a clicked task's comment-count cell to open its comments drawer. */
    onSelectTaskComments: (taskId: string, taskName: string) => void;
    /** Bump this (e.g. a counter) to force a refetch of per-task comment counts —
     * used after a comment is posted in the task comments drawer, since that
     * write happens outside this component's own data flow. */
    commentsRefreshKey?: number;
}) {
    const theme = useCssTheme();
    const { connection, query, columnMetadata } = projectDetailTasks(projectId);
    const { data, isLoading, error } = useSemanticModelQuery({ connection, query });

    // Per-task comment counts, fetched separately from the semantic-model task
    // data since comments live in Rayfin/MSSQL, not the Lakehouse/semantic model.
    const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map());

    useEffect(() => {
        let cancelled = false;
        listAllForProject(projectId)
            .then((rows) => {
                if (cancelled) return;
                const counts = new Map<string, number>();
                for (const row of rows) {
                    if (!row.task_id) continue;
                    counts.set(row.task_id, (counts.get(row.task_id) ?? 0) + 1);
                }
                setCommentCounts(counts);
            })
            .catch(() => {
                // Comment counts are supplementary; leave counts at 0 on failure
                // rather than surfacing an error over the whole tasks table.
                if (!cancelled) setCommentCounts(new Map());
            });
        return () => {
            cancelled = true;
        };
    }, [projectId, commentsRefreshKey]);

    const columns = useMemo(() => baseColumns(onSelectTaskComments), [onSelectTaskComments]);

    // Row click -> select the task's zone in the 3D scene. The DataGrid builds
    // select predicates ONLY from the columns in its `columns` prop (not every
    // field of the datum), so the driver must be a rendered column: we key off
    // the visible "Zone" column (ZoneName). zone_name is unique per project, so
    // the parent can resolve it back to a location id. Header/sort clicks don't
    // emit select events, so sorting never changes the selection.
    const handleInteraction = useCallback(
        (events: InteractionEvent[]) => {
            for (const event of events) {
                if (event.action !== "select") continue;
                const predicate = event.selections[0]?.predicates.find(
                    (p) => p.type === "set" && p.name === "ZoneName",
                );
                const zoneName = predicate?.type === "set" ? predicate.values[0] : undefined;
                if (typeof zoneName === "string") onSelectZoneName(zoneName);
            }
        },
        [onSelectZoneName],
    );

    const dataTable = useMemo(() => {
        if (data?.status !== "success") return null;
        const base = toDataTable(data.table, columnMetadata);
        const taskIdIndex = base.columns.findIndex((c) => c.name === "TaskId");
        return {
            columns: [...base.columns, { name: "CommentCount", displayName: "Comments" }],
            rows: base.rows.map((row) => {
                const taskId = taskIdIndex >= 0 ? String(row[taskIdIndex] ?? "") : "";
                return [...row, commentCounts.get(taskId) ?? 0];
            }),
        };
    }, [data, columnMetadata, commentCounts]);

    return (
        <Panel title="Project Tasks" subtitle="All tasks with planned vs. actual delivery" bodyClassName="p-none">
            {isLoading ? (
                <div className="p-l">
                    <PanelSkeleton className="h-[280px]" />
                </div>
            ) : error || data?.status === "error" ? (
                <PanelError
                    message={error?.message ?? (data?.status === "error" ? data.error.message : "Failed to load tasks.")}
                />
            ) : !dataTable ? null : dataTable.rows.length === 0 ? (
                <PanelEmpty message="No tasks for this project." />
            ) : (
                <div className="max-h-[440px] overflow-auto [&_[role=row]]:cursor-pointer">
                    <DataGrid
                        columns={columns}
                        data={dataTable}
                        theme={theme}
                        defaultSort={[{ columnId: "DelayDays", direction: "desc" }]}
                        onInteraction={handleInteraction}
                    />
                </div>
            )}
        </Panel>
    );
}
