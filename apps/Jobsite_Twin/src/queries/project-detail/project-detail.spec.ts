//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { projectDetailHeader } from "./project-detail-header";
import { projectDetailKpis } from "./project-detail-kpis";
import { projectDetailZones } from "./project-detail-zones";
import { projectDetailTasks } from "./project-detail-tasks";

describe("project-detail query factories", () => {
    it("substitute the project id sentinel and target the model connection", () => {
        for (const factory of [projectDetailHeader, projectDetailKpis, projectDetailZones, projectDetailTasks]) {
            const { connection, query } = factory("PRJ-0007");
            expect(connection).toBe("model");
            expect(query).not.toContain("__PROJECT_ID__");
            expect(query).toContain("PRJ-0007");
        }
    });

    it("escape embedded double quotes to prevent breaking out of the DAX string literal", () => {
        const { query } = projectDetailHeader('PRJ-0007" evil');
        // The inner quote is doubled, so the literal stays intact.
        expect(query).toContain('PRJ-0007"" evil');
    });

    it("header maps the exact DAX column names including is_outlier", () => {
        const { columnMetadata } = projectDetailHeader("PRJ-0001");
        expect(columnMetadata["[project_name]"]).toMatchObject({ name: "ProjectName" });
        expect(columnMetadata["[status]"]).toMatchObject({ name: "Status" });
        expect(columnMetadata["[risk_score]"]).toMatchObject({ name: "RiskScore" });
        expect(columnMetadata["[is_outlier]"]).toMatchObject({ name: "IsOutlier" });
    });

    it("kpis map the four project-scoped measures with currency formats", () => {
        const { columnMetadata } = projectDetailKpis("PRJ-0001");
        expect(columnMetadata["[Total Actual Cost]"]).toMatchObject({ name: "TotalActualCost", format: "$#,0" });
        expect(columnMetadata["[Total Cost Overrun]"]).toMatchObject({ name: "TotalCostOverrun", format: "$#,0" });
        expect(columnMetadata["[Delayed Task Count]"]).toMatchObject({ name: "DelayedTaskCount" });
        expect(columnMetadata["[Max Project Delay Days]"]).toMatchObject({ name: "MaxProjectDelayDays" });
    });

    it("zones expose coords and per-status counts keyed by exact DAX names", () => {
        const { columnMetadata } = projectDetailZones("PRJ-0001");
        expect(columnMetadata["locations[zone_name]"]).toMatchObject({ name: "ZoneName" });
        expect(columnMetadata["locations[z_coord]"]).toMatchObject({ name: "ZCoord" });
        expect(columnMetadata["[delayed_count]"]).toMatchObject({ name: "DelayedCount" });
        expect(columnMetadata["[total_tasks]"]).toMatchObject({ name: "TotalTasks" });
    });

    it("tasks expose delay_days and location_id for zone filtering", () => {
        const { query, columnMetadata } = projectDetailTasks("PRJ-0001");
        expect(query).toContain("DATEDIFF");
        expect(columnMetadata["[delay_days]"]).toMatchObject({ name: "DelayDays" });
        expect(columnMetadata["[location_id]"]).toMatchObject({ name: "LocationId" });
        expect(columnMetadata["[task_status]"]).toMatchObject({ name: "TaskStatus" });
    });

    it("tasks pull zone_name via the locations relationship for the Zone column", () => {
        const { query, columnMetadata } = projectDetailTasks("PRJ-0001");
        // The Zone column + row-click selection driver both key off ZoneName, so
        // the query must project the related zone_name and the metadata must map it.
        expect(query).toContain("RELATED(locations[zone_name])");
        expect(columnMetadata["[zone_name]"]).toMatchObject({ name: "ZoneName", displayName: "Zone" });
    });
});
