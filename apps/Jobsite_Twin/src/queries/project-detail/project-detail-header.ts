//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./project-detail-header.dax?raw";
import { applyProjectId } from "./apply-project-id";

/** Connection alias from fabric.yaml. */
const connection = "model";

/** Column metadata keyed by the exact DAX column name from the query output. */
const columnMetadata: ColumnMetadataMap = {
    "[project_name]": { name: "ProjectName", displayName: "Project" },
    "[status]": { name: "Status", displayName: "Status" },
    "[risk_score]": { name: "RiskScore", displayName: "Risk Score", format: "#,0.0" },
    "[is_outlier]": { name: "IsOutlier", displayName: "Outlier" },
};

/** Header row for a single project: name, status, risk score, outlier flag. */
export function projectDetailHeader(projectId: string) {
    return { connection, query: applyProjectId(baseQuery, projectId), columnMetadata };
}
