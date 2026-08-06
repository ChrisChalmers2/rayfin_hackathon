//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./project-detail-kpis.dax?raw";
import { applyProjectId } from "./apply-project-id";

/** Connection alias from fabric.yaml. */
const connection = "model";

/** Column metadata keyed by the exact DAX column name from the query output. */
const columnMetadata: ColumnMetadataMap = {
    "[Total Actual Cost]": { name: "TotalActualCost", displayName: "Total Actual Cost", format: "$#,0" },
    "[Total Cost Overrun]": { name: "TotalCostOverrun", displayName: "Total Cost Overrun", format: "$#,0" },
    "[Delayed Task Count]": { name: "DelayedTaskCount", displayName: "Delayed Tasks", format: "#,0" },
    "[Max Project Delay Days]": { name: "MaxProjectDelayDays", displayName: "Max Delay (days)", format: "#,0" },
};

/** Project-scoped KPI totals for the detail header. */
export function projectDetailKpis(projectId: string) {
    return { connection, query: applyProjectId(baseQuery, projectId), columnMetadata };
}
