//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useCallback } from "react";
import { DataGrid, type GridColumnDef } from "@microsoft/fabric-datagrid";
import { useCssTheme } from "@microsoft/fabric-visuals";
import type { InteractionEvent } from "@microsoft/fabric-visuals-core";
import { topCostOverruns } from "@/queries/portfolio";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import type { ProjectStatus } from "@/hooks/use-status-filter";
import { Panel, PanelSkeleton, PanelError, PanelEmpty } from "./panel.component";
import { STATUS_COLORS } from "./status-colors";

const COLUMNS: GridColumnDef[] = [
    { id: "ProjectName", header: "Project", sortable: true },
    {
        id: "Status",
        header: "Status",
        sortable: true,
        cellRenderer: (value) => {
            const status = String(value ?? "");
            const color = STATUS_COLORS[status] ?? "var(--color-muted-foreground)";
            return (
                <span className="inline-flex items-center gap-xs font-base text-200 leading-200">
                    <span
                        aria-hidden
                        className="inline-block h-s w-s rounded-full"
                        style={{ backgroundColor: color }}
                    />
                    {status}
                </span>
            );
        },
    },
    { id: "ProjectDelayDays", header: "Delay (days)", sortable: true, numeric: true },
    { id: "TotalCostOverrun", header: "Cost Overrun", sortable: true, numeric: true },
];

interface TopCostOverrunsTableProps {
    /** The active status filter, or `null` when the portfolio is unfiltered. */
    status: ProjectStatus | null;
    /** Invoked with the clicked row's project id for drill-through. */
    onSelectProject: (projectId: string) => void;
}

/** Top 5 projects by total cost overrun, sorted descending. */
export function TopCostOverrunsTable({ status, onSelectProject }: TopCostOverrunsTableProps) {
    const theme = useCssTheme();
    const { connection, query, columnMetadata } = topCostOverruns({ status: status ?? undefined });
    const { data, isLoading, error } = useSemanticModelQuery({ connection, query });

    // Row click → drill-through. DataGrid select events carry every field of the
    // clicked datum as predicates, so the hidden ProjectId column is available
    // even though it isn't rendered. Sort/header clicks don't emit select events,
    // so sorting never triggers navigation.
    const handleInteraction = useCallback(
        (events: InteractionEvent[]) => {
            for (const event of events) {
                if (event.action !== "select") continue;
                const predicate = event.selections[0]?.predicates.find(
                    (p) => p.type === "set" && p.name === "ProjectId",
                );
                const id = predicate?.type === "set" ? predicate.values[0] : undefined;
                if (typeof id === "string") onSelectProject(id);
            }
        },
        [onSelectProject],
    );

    return (
        <Panel
            title="Top 5 by Cost Overrun"
            subtitle="Projects with the largest budget variance"
            bodyClassName="p-none"
        >
            {isLoading ? (
                <div className="p-l">
                    <PanelSkeleton className="h-[240px]" />
                </div>
            ) : error || data?.status === "error" ? (
                <PanelError
                    message={error?.message ?? (data?.status === "error" ? data.error.message : "Failed to load table.")}
                />
            ) : data?.status !== "success" ? null : data.table.rows.length === 0 ? (
                <PanelEmpty message="No cost overruns to report." />
            ) : (
                <div className="max-h-[360px] overflow-auto [&_[role=row]]:cursor-pointer">
                    <DataGrid
                        columns={COLUMNS}
                        data={toDataTable(data.table, columnMetadata)}
                        theme={theme}
                        defaultSort={[{ columnId: "TotalCostOverrun", direction: "desc" }]}
                        onInteraction={handleInteraction}
                    />
                </div>
            )}
        </Panel>
    );
}
