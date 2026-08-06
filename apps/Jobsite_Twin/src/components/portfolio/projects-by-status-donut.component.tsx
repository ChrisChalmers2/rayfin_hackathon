//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useCallback } from "react";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import type { InteractionEvent } from "@microsoft/fabric-visuals-core";
import { projectsByStatus } from "@/queries/portfolio";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { parseStatusParam, type ProjectStatus } from "@/hooks/use-status-filter";
import { Panel, PanelSkeleton, PanelError, PanelEmpty } from "./panel.component";

interface ProjectsByStatusDonutProps {
    /** The active status filter — its arc segment gets an outline glow. */
    activeStatus: ProjectStatus | null;
    /** Toggles the clicked segment's status as the portfolio cross-filter. */
    onToggleStatus: (status: ProjectStatus) => void;
}

/**
 * Donut chart of project counts grouped by delivery status. The donut data
 * stays unfiltered — it is the control surface for the cross-filter. Clicking
 * a segment toggles that status, and the active segment is outlined with a glow.
 */
export function ProjectsByStatusDonut({ activeStatus, onToggleStatus }: ProjectsByStatusDonutProps) {
    const theme = useCssTheme();
    const { connection, query, columnMetadata, vegaLiteSpec } = projectsByStatus({ activeStatus });
    const { data, isLoading, error } = useSemanticModelQuery({ connection, query });

    const handleInteraction = useCallback(
        (events: InteractionEvent[]) => {
            for (const event of events) {
                if (event.action !== "select") continue;
                const predicate = event.selections[0]?.predicates.find(
                    (p) => p.type === "set" && p.name === "Status",
                );
                const value = predicate?.type === "set" ? predicate.values[0] : undefined;
                const status = parseStatusParam(typeof value === "string" ? value : null);
                if (status) onToggleStatus(status);
            }
        },
        [onToggleStatus],
    );

    return (
        <Panel
            title="Projects by Status"
            subtitle="Share of the portfolio by delivery status"
            className="h-full"
            bodyClassName="h-[380px] p-m"
        >
            {isLoading ? (
                <PanelSkeleton />
            ) : error || data?.status === "error" ? (
                <PanelError
                    message={error?.message ?? (data?.status === "error" ? data.error.message : "Failed to load chart.")}
                />
            ) : data?.status !== "success" ? null : data.table.rows.length === 0 ? (
                <PanelEmpty message="No projects to summarize." />
            ) : (
                <VegaVisual
                    spec={vegaLiteSpec}
                    data={toDataTable(data.table, columnMetadata)}
                    theme={theme}
                    onInteraction={handleInteraction}
                    style={{ width: "100%", height: "100%" }}
                />
            )}
        </Panel>
    );
}
