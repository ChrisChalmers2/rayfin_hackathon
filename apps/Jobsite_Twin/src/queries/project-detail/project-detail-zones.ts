//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./project-detail-zones.dax?raw";
import { applyProjectId } from "./apply-project-id";

/** Connection alias from fabric.yaml. */
const connection = "model";

/**
 * Column metadata keyed by the exact DAX column name from the query output.
 * Consumed by the 3D zone scene (not a Vega visual), so only clean field
 * names are needed for downstream access.
 */
const columnMetadata: ColumnMetadataMap = {
    "locations[location_id]": { name: "LocationId", displayName: "Zone ID" },
    "locations[zone_name]": { name: "ZoneName", displayName: "Zone" },
    "locations[x_coord]": { name: "XCoord", displayName: "X" },
    "locations[y_coord]": { name: "YCoord", displayName: "Y" },
    "locations[z_coord]": { name: "ZCoord", displayName: "Z" },
    "[delayed_count]": { name: "DelayedCount", displayName: "Delayed", format: "#,0" },
    "[at_risk_count]": { name: "AtRiskCount", displayName: "At Risk", format: "#,0" },
    "[on_track_count]": { name: "OnTrackCount", displayName: "On Track", format: "#,0" },
    "[complete_count]": { name: "CompleteCount", displayName: "Complete", format: "#,0" },
    "[total_tasks]": { name: "TotalTasks", displayName: "Total Tasks", format: "#,0" },
};

/** Zones (locations) for a project with per-zone task-status counts. */
export function projectDetailZones(projectId: string) {
    return { connection, query: applyProjectId(baseQuery, projectId), columnMetadata };
}
