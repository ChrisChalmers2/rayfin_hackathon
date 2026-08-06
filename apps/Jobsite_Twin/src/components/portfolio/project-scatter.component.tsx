//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useCallback } from "react";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import type { InteractionEvent } from "@microsoft/fabric-visuals-core";
import { projectScatter } from "@/queries/portfolio";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import type { ProjectStatus } from "@/hooks/use-status-filter";
import { Panel, PanelSkeleton, PanelError, PanelEmpty } from "./panel.component";

interface ProjectScatterProps {
    /** Invoked with the clicked project's id for drill-through. */
    onSelectProject: (projectId: string) => void;
    /** The active status filter, or `null` when the portfolio is unfiltered. */
    status: ProjectStatus | null;
}

/**
 * Scatter of every project by cost overrun (x) and average delay (y),
 * colored by status and sized by risk score. The clicked point stays
 * highlighted (native self-highlight) and its id is emitted for drill-through.
 */
export function ProjectScatter({ onSelectProject, status }: ProjectScatterProps) {
    const theme = useCssTheme();
    const { connection, query, columnMetadata, vegaLiteSpec } = projectScatter({ status: status ?? undefined });
    const { data, isLoading, error } = useSemanticModelQuery({ connection, query });

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
            title="Project Risk Map"
            subtitle="Cost overrun vs. average delay — sized by risk, colored by status"
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
                <PanelEmpty message="No projects to plot." />
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
