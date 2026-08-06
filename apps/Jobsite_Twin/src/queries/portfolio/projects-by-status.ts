//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./projects-by-status.dax?raw";
import spec from "./projects-by-status.json";

/** Connection alias from fabric.yaml. */
const connection = "model";

/** Column metadata keyed by the exact DAX column name from the query output. */
const columnMetadata: ColumnMetadataMap = {
    "projects[status]": { name: "Status", displayName: "Status" },
    "[Project Count]": { name: "ProjectCount", displayName: "Projects", format: "#,0" },
};

/** Optional parameters for the status donut. */
export interface ProjectsByStatusParams {
    /**
     * The status currently driving the portfolio cross-filter. When set, the
     * matching arc segment gets an outline glow (a stroke in its own color) so
     * the active filter reads directly on the donut. The donut data itself stays
     * unfiltered — it is the control surface for the cross-filter.
     */
    activeStatus?: string | null;
}

/** Donut of project counts grouped by delivery status. */
export function projectsByStatus(params?: ProjectsByStatusParams) {
    const active = params?.activeStatus;
    let vegaLiteSpec = spec as unknown as VisualizationSpec;

    if (active) {
        const base = spec as unknown as {
            encoding: { color: { scale: unknown }; [key: string]: unknown };
            [key: string]: unknown;
        };
        // JSON.stringify safely quotes the status for the Vega test expression.
        const test = `datum.Status === ${JSON.stringify(active)}`;
        vegaLiteSpec = {
            ...base,
            encoding: {
                ...base.encoding,
                // Stroke each arc in its own status color, but only give the
                // active segment a visible ~3px, ~60%-opacity outline.
                stroke: { field: "Status", type: "nominal", scale: base.encoding.color.scale, legend: null },
                strokeWidth: { condition: { test, value: 3 }, value: 0 },
                strokeOpacity: { condition: { test, value: 0.6 }, value: 0 },
            },
        } as unknown as VisualizationSpec;
    }

    return { connection, query, columnMetadata, vegaLiteSpec };
}
