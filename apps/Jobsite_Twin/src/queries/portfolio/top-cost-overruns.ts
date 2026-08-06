//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./top-cost-overruns.dax?raw";
import { applyStatusFilter } from "./apply-status-filter";

/** Connection alias from fabric.yaml. */
const connection = "model";

/** Column metadata keyed by the exact DAX column name from the query output. */
const columnMetadata: ColumnMetadataMap = {
    "projects[project_id]": { name: "ProjectId", displayName: "Project ID" },
    "projects[project_name]": { name: "ProjectName", displayName: "Project" },
    "projects[status]": { name: "Status", displayName: "Status" },
    "[project_delay_days]": { name: "ProjectDelayDays", displayName: "Delay (days)", format: "#,0" },
    "[total_cost_overrun]": { name: "TotalCostOverrun", displayName: "Cost Overrun", format: "$#,0" },
};

/** Optional parameters for the Top-5 cost overruns query. */
export interface TopCostOverrunsParams {
    /** Restrict results to a single project status (e.g. "Delayed"). */
    status?: string;
}

/** Top 5 projects by total cost overrun, sorted descending. */
export function topCostOverruns(params?: TopCostOverrunsParams) {
    const query = applyStatusFilter(baseQuery, params?.status);
    return { connection, query, columnMetadata };
}
