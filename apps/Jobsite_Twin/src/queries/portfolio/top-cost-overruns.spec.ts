//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { topCostOverruns } from "./top-cost-overruns";

describe("topCostOverruns", () => {
    it("targets the model connection with a TOPN(5, ...) query sorted by cost overrun", () => {
        const { connection, query } = topCostOverruns();
        expect(connection).toBe("model");
        expect(query).toContain("TOPN");
        expect(query).toContain("5");
        expect(query).toContain("[Total Cost Overrun]");
        expect(query).toContain("DESC");
    });

    it("maps the exact DAX column names to clean field names and formats", () => {
        const { columnMetadata } = topCostOverruns();
        expect(columnMetadata["projects[project_name]"]).toMatchObject({ name: "ProjectName" });
        expect(columnMetadata["projects[status]"]).toMatchObject({ name: "Status" });
        expect(columnMetadata["[project_delay_days]"]).toMatchObject({ name: "ProjectDelayDays" });
        expect(columnMetadata["[total_cost_overrun]"]).toMatchObject({ name: "TotalCostOverrun", format: "$#,0" });
    });
});
