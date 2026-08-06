//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./project-detail-tasks.dax?raw";
import { applyProjectId } from "./apply-project-id";

/** Connection alias from fabric.yaml. */
const connection = "model";

/** Column metadata keyed by the exact DAX column name from the query output. */
const columnMetadata: ColumnMetadataMap = {
    "[task_id]": { name: "TaskId", displayName: "Task ID" },
    "[task_name]": { name: "TaskName", displayName: "Task" },
    "[task_status]": { name: "TaskStatus", displayName: "Status" },
    "[location_id]": { name: "LocationId", displayName: "Zone ID" },
    "[zone_name]": { name: "ZoneName", displayName: "Zone" },
    "[planned_end_date]": { name: "PlannedEndDate", displayName: "Planned End", format: "mm/dd/yyyy" },
    "[actual_end_date]": { name: "ActualEndDate", displayName: "Actual End", format: "mm/dd/yyyy" },
    "[delay_days]": { name: "DelayDays", displayName: "Delay (days)", format: "#,0" },
};

/** All tasks in a project with a computed delay_days column. */
export function projectDetailTasks(projectId: string) {
    return { connection, query: applyProjectId(baseQuery, projectId), columnMetadata };
}
