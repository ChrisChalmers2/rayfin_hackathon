//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { projectsByStatus } from "./projects-by-status";

describe("projectsByStatus", () => {
    it("targets the model connection grouping project count by status", () => {
        const { connection, query } = projectsByStatus();
        expect(connection).toBe("model");
        expect(query).toContain("SUMMARIZECOLUMNS");
        expect(query).toContain("projects[status]");
        expect(query).toContain("[Total Projects]");
    });

    it("maps the exact DAX column names to clean field names", () => {
        const { columnMetadata } = projectsByStatus();
        expect(columnMetadata["projects[status]"]).toMatchObject({ name: "Status" });
        expect(columnMetadata["[Project Count]"]).toMatchObject({ name: "ProjectCount" });
    });

    it("exposes a donut (arc) spec keyed on ProjectCount and Status", () => {
        const { vegaLiteSpec } = projectsByStatus();
        const spec = vegaLiteSpec as unknown as Record<string, unknown>;
        expect((spec.mark as { type?: string }).type).toBe("arc");
        const encoding = spec.encoding as Record<string, { field?: string }>;
        expect(encoding.theta.field).toBe("ProjectCount");
        expect(encoding.color.field).toBe("Status");
    });
});
