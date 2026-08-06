//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
    zoneMatchesStatusFilter,
    isDimmedByStatusFilter,
    STATUS_FILTER_OPTIONS,
    DEFAULT_STATUS_FILTER,
} from "./status-filter";

describe("STATUS_FILTER_OPTIONS / DEFAULT_STATUS_FILTER", () => {
    it("defaults to All", () => {
        expect(DEFAULT_STATUS_FILTER).toBe("All");
    });

    it("includes All plus every task status plus No tasks", () => {
        expect(STATUS_FILTER_OPTIONS).toEqual(["All", "Delayed", "At Risk", "On Track", "Complete", "No tasks"]);
    });
});

describe("zoneMatchesStatusFilter", () => {
    it("matches every status when filter is All", () => {
        expect(zoneMatchesStatusFilter("Delayed", "All")).toBe(true);
        expect(zoneMatchesStatusFilter(null, "All")).toBe(true);
        expect(zoneMatchesStatusFilter("Complete", "All")).toBe(true);
    });

    it("matches only null status for No tasks", () => {
        expect(zoneMatchesStatusFilter(null, "No tasks")).toBe(true);
        expect(zoneMatchesStatusFilter("On Track", "No tasks")).toBe(false);
    });

    it("matches exact status equality for concrete filters", () => {
        expect(zoneMatchesStatusFilter("Delayed", "Delayed")).toBe(true);
        expect(zoneMatchesStatusFilter("At Risk", "Delayed")).toBe(false);
        expect(zoneMatchesStatusFilter(null, "Delayed")).toBe(false);
    });
});

describe("isDimmedByStatusFilter", () => {
    it("never dims when the filter is All", () => {
        expect(isDimmedByStatusFilter("Delayed", "All")).toBe(false);
        expect(isDimmedByStatusFilter(null, "All")).toBe(false);
    });

    it("dims zones that don't match an active filter", () => {
        expect(isDimmedByStatusFilter("On Track", "Delayed")).toBe(true);
        expect(isDimmedByStatusFilter(null, "Delayed")).toBe(true);
    });

    it("does not dim zones that match an active filter", () => {
        expect(isDimmedByStatusFilter("Delayed", "Delayed")).toBe(false);
        expect(isDimmedByStatusFilter(null, "No tasks")).toBe(false);
    });
});
