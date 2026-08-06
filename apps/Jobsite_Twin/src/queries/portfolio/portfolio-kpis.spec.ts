//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { portfolioKpis } from "./portfolio-kpis";

describe("portfolioKpis", () => {
    it("targets the model connection with a ROW query of the four KPI measures", () => {
        const { connection, query } = portfolioKpis();
        expect(connection).toBe("model");
        expect(query).toContain("EVALUATE");
        expect(query).toContain("[Total Projects]");
        expect(query).toContain("[Delayed Project Count]");
        expect(query).toContain("[Total Cost Overrun]");
        expect(query).toContain("[Avg Risk Score]");
    });

    it("maps the exact DAX column names to clean field names and formats", () => {
        const { columnMetadata } = portfolioKpis();
        expect(columnMetadata["[Total Projects]"]).toMatchObject({ name: "TotalProjects" });
        expect(columnMetadata["[Delayed Project Count]"]).toMatchObject({ name: "DelayedProjectCount" });
        expect(columnMetadata["[Total Cost Overrun]"]).toMatchObject({ name: "TotalCostOverrun", format: "$#,0" });
        expect(columnMetadata["[Avg Risk Score]"]).toMatchObject({ name: "AvgRiskScore" });
    });
});
