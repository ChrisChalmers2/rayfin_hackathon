//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { projectScatter } from "./project-scatter";

describe("projectScatter", () => {
    it("targets the model connection with a per-project SUMMARIZECOLUMNS query", () => {
        const { connection, query } = projectScatter();
        expect(connection).toBe("model");
        expect(query).toContain("SUMMARIZECOLUMNS");
        expect(query).toContain("projects[project_id]");
        expect(query).toContain("projects[status]");
        expect(query).toContain("[Total Cost Overrun]");
        expect(query).toContain("[Avg Project Delay Days]");
    });

    it("maps the exact DAX column names, including ProjectId used for drill-through", () => {
        const { columnMetadata } = projectScatter();
        expect(columnMetadata["projects[project_id]"]).toMatchObject({ name: "ProjectId" });
        expect(columnMetadata["projects[status]"]).toMatchObject({ name: "Status" });
        expect(columnMetadata["projects[risk_score]"]).toMatchObject({ name: "RiskScore" });
        expect(columnMetadata["[Total Cost Overrun]"]).toMatchObject({ name: "TotalCostOverrun" });
    });

    it("exposes a Vega-Lite scatter spec encoding cost overrun, delay, status and risk", () => {
        const { vegaLiteSpec } = projectScatter();
        const spec = vegaLiteSpec as unknown as Record<string, unknown>;
        expect(spec.mark).toBe("circle");
        const encoding = spec.encoding as Record<string, { field?: string }>;
        expect(encoding.x.field).toBe("TotalCostOverrun");
        expect(encoding.y.field).toBe("AvgProjectDelayDays");
        expect(encoding.color.field).toBe("Status");
        expect(encoding.size.field).toBe("RiskScore");
    });
});
