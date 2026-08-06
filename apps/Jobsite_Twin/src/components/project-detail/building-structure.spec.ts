//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { columnHeight, columnPositions } from "./building-structure";

describe("columnHeight", () => {
    it("spans ground to the top of the roof cap for a collapsed stack", () => {
        // 4 levels, spacing 0.9, baseY 0.6, slab 0.5, roof 0.2:
        // topSlabCenter = 0.6 + 3*0.9 = 3.3; + 0.25 + 0.2 = 3.75
        expect(columnHeight(4, 0.9, 0.6, 0.5, 0.2)).toBeCloseTo(3.75);
    });

    it("grows with spacing when exploded", () => {
        const collapsed = columnHeight(4, 0.9, 0.6, 0.5, 0.2);
        const exploded = columnHeight(4, 3.2, 0.6, 0.5, 0.2);
        expect(exploded).toBeGreaterThan(collapsed);
        // topSlabCenter = 0.6 + 3*3.2 = 10.2; + 0.45 = 10.65
        expect(exploded).toBeCloseTo(10.65);
    });

    it("handles a single-level stack (no vertical span)", () => {
        // topSlabCenter = baseY; + 0.25 + 0.2 = 1.05
        expect(columnHeight(1, 0.9, 0.6, 0.5, 0.2)).toBeCloseTo(1.05);
    });
});

describe("columnPositions", () => {
    it("returns the four footprint corners", () => {
        expect(columnPositions(8, 6)).toEqual([
            [-4, -3],
            [4, -3],
            [-4, 3],
            [4, 3],
        ]);
    });
});
