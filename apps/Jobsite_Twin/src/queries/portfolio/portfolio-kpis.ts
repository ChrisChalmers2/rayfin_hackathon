//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./portfolio-kpis.dax?raw";
import { applyStatusFilter } from "./apply-status-filter";

/** Connection alias from fabric.yaml. */
const connection = "model";

/** Column metadata keyed by the exact DAX column name from the query output. */
const columnMetadata: ColumnMetadataMap = {
    "[Total Projects]": { name: "TotalProjects", displayName: "Total Projects", format: "#,0" },
    "[Delayed Project Count]": { name: "DelayedProjectCount", displayName: "Delayed Projects", format: "#,0" },
    "[Total Cost Overrun]": { name: "TotalCostOverrun", displayName: "Total Cost Overrun", format: "$#,0" },
    "[Avg Risk Score]": { name: "AvgRiskScore", displayName: "Avg Risk Score", format: "#,0.0" },
};

/** Optional parameters for the portfolio KPI totals query. */
export interface PortfolioKpisParams {
    /** Restrict totals to a single project status (e.g. "Delayed"). */
    status?: string;
}

/** Portfolio-level KPI totals rendered in the top card row. */
export function portfolioKpis(params?: PortfolioKpisParams) {
    const query = applyStatusFilter(baseQuery, params?.status);
    return { connection, query, columnMetadata };
}
