//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./project-scatter.dax?raw";
import spec from "./project-scatter.json";
import { applyStatusFilter } from "./apply-status-filter";

/** Connection alias from fabric.yaml. */
const connection = "model";

/** Column metadata keyed by the exact DAX column name from the query output. */
const columnMetadata: ColumnMetadataMap = {
    "projects[project_id]": { name: "ProjectId", displayName: "Project ID" },
    "projects[project_name]": { name: "ProjectName", displayName: "Project" },
    "projects[status]": { name: "Status", displayName: "Status" },
    "projects[risk_score]": { name: "RiskScore", displayName: "Risk Score", format: "#,0.0" },
    "[Total Cost Overrun]": { name: "TotalCostOverrun", displayName: "Cost Overrun", format: "$#,0" },
    "[Avg Project Delay Days]": { name: "AvgProjectDelayDays", displayName: "Avg Delay (days)", format: "#,0" },
};

/** Optional parameters for the per-project scatter query. */
export interface ProjectScatterParams {
    /** Restrict points to a single project status (e.g. "Delayed"). */
    status?: string;
}

/** Per-project scatter: cost overrun (x) vs. average delay (y), colored by status, sized by risk. */
export function projectScatter(params?: ProjectScatterParams) {
    const query = applyStatusFilter(baseQuery, params?.status);
    return {
        connection,
        query,
        columnMetadata,
        vegaLiteSpec: spec as unknown as VisualizationSpec,
    };
}
